CREATE TYPE "public"."checkout_status" AS ENUM('draft', 'ready', 'converted', 'expired', 'abandoned');--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"user_id" text,
	"guest_token" text,
	"status" "checkout_status" DEFAULT 'draft' NOT NULL,
	"payment_method" "payment_method",
	"subtotal_minor" integer DEFAULT 0 NOT NULL,
	"delivery_minor" integer DEFAULT 0 NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"recipient_name" text,
	"phone" text,
	"county" text,
	"town" text,
	"delivery_address" text,
	"customer_note" text,
	"converted_order_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_cart_idx" ON "checkout_sessions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "checkout_user_status_idx" ON "checkout_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "checkout_guest_token_idx" ON "checkout_sessions" USING btree ("guest_token");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_converted_order_unique" ON "checkout_sessions" USING btree ("converted_order_id");