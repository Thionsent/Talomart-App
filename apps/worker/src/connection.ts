import type { ConnectionOptions } from "bullmq";

const redisUrl = new URL(
  process.env.REDIS_URL || "redis://localhost:6379"
);

export const redisConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  ...(redisUrl.username
    ? { username: decodeURIComponent(redisUrl.username) }
    : {}),
  ...(redisUrl.password
    ? { password: decodeURIComponent(redisUrl.password) }
    : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: true
};
