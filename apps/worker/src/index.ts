import pino from "pino";

import { paymentQueue, notificationQueue } from "./queues";
import { notificationWorker } from "./workers/notification-worker";
import { paymentWorker } from "./workers/payment-worker";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

logger.info("Talomart background workers started");

async function shutdown(signal: string) {
  logger.info({ signal }, "Stopping Talomart background workers");
  await Promise.all([
    paymentWorker.close(),
    notificationWorker.close(),
    paymentQueue.close(),
    notificationQueue.close()
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
