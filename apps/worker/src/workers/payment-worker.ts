import { Worker } from "bullmq";
import pino from "pino";

import type { PaymentCallbackJob } from "../jobs";
import { redisConnection } from "../connection";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const paymentWorker = new Worker<PaymentCallbackJob>(
  "payments",
  async (job) => {
    // Reconcile provider callbacks in a database transaction. The unique
    // checkout_request_id constraint makes repeated callbacks safe.
    logger.info(
      {
        jobId: job.id,
        checkoutRequestId: job.data.checkoutRequestId,
        resultCode: job.data.resultCode
      },
      "Processing M-Pesa callback"
    );
  },
  {
    connection: redisConnection,
    concurrency: 10
  }
);

paymentWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "Payment job failed");
});
