import { Worker } from "bullmq";
import pino from "pino";

import type { OrderNotificationJob } from "../jobs";
import { redisConnection } from "../connection";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const notificationWorker = new Worker<OrderNotificationJob>(
  "notifications",
  async (job) => {
    logger.info(
      {
        jobId: job.id,
        orderId: job.data.orderId,
        channel: job.data.channel,
        template: job.data.template
      },
      "Sending order notification"
    );
  },
  {
    connection: redisConnection,
    concurrency: 20
  }
);

notificationWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "Notification job failed");
});
