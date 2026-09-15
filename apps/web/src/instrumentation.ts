export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertRuntimeEnvironment } = await import("@/lib/env");
  assertRuntimeEnvironment();

  const globalForMpesaSweep = globalThis as typeof globalThis & {
    talomartMpesaExpiryTimer?: NodeJS.Timeout;
    talomartSecurityMaintenanceTimer?: NodeJS.Timeout;
  };
  if (globalForMpesaSweep.talomartMpesaExpiryTimer) return;

  const [{ logger }, { expireStaleMpesaOrders }] = await Promise.all([
    import("@/lib/logger"),
    import("@/lib/payments/mpesa-order-service")
  ]);
  const runSweep = async () => {
    try {
      const expired = await expireStaleMpesaOrders(25);
      if (expired > 0) {
        logger.info({ expired }, "Expired abandoned M-Pesa orders");
      }
    } catch (error) {
      logger.warn({ error }, "M-Pesa abandonment sweep failed");
    }
  };

  const timer = setInterval(() => void runSweep(), 60_000);
  timer.unref();
  globalForMpesaSweep.talomartMpesaExpiryTimer = timer;
  void runSweep();

  if (!globalForMpesaSweep.talomartSecurityMaintenanceTimer) {
    const { cleanExpiredSecurityRateLimits } = await import(
      "@/lib/security-maintenance"
    );
    const runSecurityMaintenance = async () => {
      try {
        const deleted = await cleanExpiredSecurityRateLimits();
        const total = deleted.auth + deleted.endpoint + deleted.orderLookup;
        if (total > 0) {
          logger.info(
            { deleted },
            "Removed expired security rate-limit records"
          );
        }
      } catch (error) {
        logger.warn({ error }, "Security rate-limit cleanup failed");
      }
    };

    const maintenanceTimer = setInterval(
      () => void runSecurityMaintenance(),
      6 * 60 * 60 * 1000
    );
    maintenanceTimer.unref();
    globalForMpesaSweep.talomartSecurityMaintenanceTimer = maintenanceTimer;
    void runSecurityMaintenance();
  }
}
