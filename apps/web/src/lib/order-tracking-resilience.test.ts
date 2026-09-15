import { describe, expect, it, vi } from "vitest";

import { loadOrderTrackingState } from "./order-tracking-resilience";

const allowed = { allowed: true, retryAfterSeconds: 600, remaining: 14 };

type TestAccess = { orderId: string };
type TestOrder = { orderNumber: string };

function dependencies() {
  return {
    getSessionUserId: vi.fn(async () => "customer-a" as string | null),
    consumeRateLimit: vi.fn(async () => allowed),
    resolveAccess: vi.fn(
      async (): Promise<TestAccess | null> => ({ orderId: "order-a" })
    ),
    findOrder: vi.fn(
      async (): Promise<TestOrder | null> => ({ orderNumber: "TLM-ORDER-A" })
    )
  };
}

describe("order tracking resilience", () => {
  it("returns an authorized order when every dependency succeeds", async () => {
    const input = dependencies();
    const result = await loadOrderTrackingState(input);

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.order.orderNumber).toBe("TLM-ORDER-A");
    }
    expect(input.resolveAccess).toHaveBeenCalledWith("customer-a");
  });

  it("fails closed when the rate-limit store is unavailable", async () => {
    const input = dependencies();
    input.consumeRateLimit.mockRejectedValueOnce(new Error("database offline"));

    const result = await loadOrderTrackingState(input);

    expect(result).toMatchObject({
      status: "unavailable",
      stage: "rate_limit"
    });
    expect(input.resolveAccess).not.toHaveBeenCalled();
    expect(input.findOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["session", "getSessionUserId"],
    ["authorization", "resolveAccess"],
    ["order", "findOrder"]
  ] as const)("contains a %s dependency failure", async (stage, dependency) => {
    const input = dependencies();
    input[dependency].mockRejectedValueOnce(new Error(`${stage} offline`));

    const result = await loadOrderTrackingState(input);

    expect(result).toMatchObject({ status: "unavailable", stage });
  });

  it("does not perform authorization after the rate limit is exceeded", async () => {
    const input = dependencies();
    input.consumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 300,
      remaining: 0
    });

    const result = await loadOrderTrackingState(input);

    expect(result.status).toBe("rate_limited");
    expect(input.resolveAccess).not.toHaveBeenCalled();
  });

  it("returns the same not-found state for denied and missing orders", async () => {
    const denied = dependencies();
    denied.resolveAccess.mockResolvedValueOnce(null);
    const missing = dependencies();
    missing.findOrder.mockResolvedValueOnce(null);

    expect((await loadOrderTrackingState(denied)).status).toBe("not_found");
    expect((await loadOrderTrackingState(missing)).status).toBe("not_found");
  });
});
