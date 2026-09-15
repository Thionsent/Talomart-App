CREATE TABLE "order_lookup_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_access_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_access_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "order_lookup_rate_limit_updated_idx" ON "order_lookup_rate_limits" USING btree ("updated_at");