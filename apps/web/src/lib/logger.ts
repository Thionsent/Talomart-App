import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "authorization",
      "req.headers.authorization",
      "consumerSecret",
      "passkey",
      "token",
      "resetUrl"
    ],
    censor: "[REDACTED]"
  }
});
