type TimeoutOptions = {
  label: string;
  milliseconds?: number;
};

const defaultQueryTimeoutMs = Number(
  process.env.TALOMART_QUERY_TIMEOUT_MS ?? 12000
);

const buildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

export function hasConfiguredDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) return false;
  if (databaseUrl.includes("PROJECT_REF")) return false;
  if (databaseUrl.includes("PASSWORD")) return false;
  if (databaseUrl.includes("REGION.pooler.supabase.com")) return false;
  if (databaseUrl.includes("talomart:talomart@localhost")) return false;

  return true;
}

export function withTimeout<T>(
  promise: Promise<T>,
  { label, milliseconds = defaultQueryTimeoutMs }: TimeoutOptions
) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${milliseconds}ms`)),
        milliseconds
      );
    })
  ]);
}

export function logFallback(label: string, error: unknown) {
  if (buildPhase && process.env.TALOMART_LOG_FALLBACKS !== "true") {
    return;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.TALOMART_LOG_FALLBACKS !== "true"
  ) {
    return;
  }

  console.warn(`${label}. Serving resilient fallback data.`, { error });
}
