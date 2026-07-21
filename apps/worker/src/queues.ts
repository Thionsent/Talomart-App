import { Queue } from "bullmq";

import type { PaymentCallbackJob, OrderNotificationJob } from "./jobs";
import { redisConnection } from "./connection";

export const paymentQueue = new Queue<PaymentCallbackJob>("payments", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 8,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000
  }
});

export const notificationQueue = new Queue<OrderNotificationJob>(
  "notifications",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000
    }
  }
);
