CREATE TABLE "email_webhook_events" (
	"svix_id" text PRIMARY KEY NOT NULL,
	"provider_message_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "recipient_email" text;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "provider_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_email" text;--> statement-breakpoint
CREATE INDEX "email_webhook_provider_idx" ON "email_webhook_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "email_webhook_created_idx" ON "email_webhook_events" USING btree ("event_created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_dedupe_unique" ON "notification_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_provider_message_unique" ON "notification_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "notification_event_retry_idx" ON "notification_events" USING btree ("channel","status","next_attempt_at");