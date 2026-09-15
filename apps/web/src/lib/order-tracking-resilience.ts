export type TrackingDependencyStage =
  | "session"
  | "rate_limit"
  | "authorization"
  | "order";

type TrackingRateLimit = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type OrderTrackingState<TOrder, TRateLimit extends TrackingRateLimit> =
  | { status: "found"; order: TOrder; rateLimit: TRateLimit }
  | { status: "not_found"; rateLimit: TRateLimit }
  | { status: "rate_limited"; rateLimit: TRateLimit }
  | {
      status: "unavailable";
      stage: TrackingDependencyStage;
      error: unknown;
    };

export async function loadOrderTrackingState<
  TAccess,
  TOrder,
  TRateLimit extends TrackingRateLimit
>(input: {
  getSessionUserId: () => Promise<string | null>;
  consumeRateLimit: (sessionUserId: string | null) => Promise<TRateLimit>;
  resolveAccess: (sessionUserId: string | null) => Promise<TAccess | null>;
  findOrder: (access: TAccess) => Promise<TOrder | null>;
}): Promise<OrderTrackingState<TOrder, TRateLimit>> {
  let sessionUserId: string | null;

  try {
    sessionUserId = await input.getSessionUserId();
  } catch (error) {
    return { status: "unavailable", stage: "session", error };
  }

  let rateLimit: TRateLimit;

  try {
    rateLimit = await input.consumeRateLimit(sessionUserId);
  } catch (error) {
    return { status: "unavailable", stage: "rate_limit", error };
  }

  if (!rateLimit.allowed) {
    return { status: "rate_limited", rateLimit };
  }

  let access: TAccess | null;

  try {
    access = await input.resolveAccess(sessionUserId);
  } catch (error) {
    return { status: "unavailable", stage: "authorization", error };
  }

  if (!access) {
    return { status: "not_found", rateLimit };
  }

  try {
    const order = await input.findOrder(access);
    return order
      ? { status: "found", order, rateLimit }
      : { status: "not_found", rateLimit };
  } catch (error) {
    return { status: "unavailable", stage: "order", error };
  }
}
