CREATE TABLE "homepage_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"body" text,
	"image_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"cta_label" text,
	"cta_href" text,
	"tone" text DEFAULT 'navy' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "homepage_banner_schedule_idx" ON "homepage_banners" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "homepage_banner_sort_idx" ON "homepage_banners" USING btree ("sort_order","created_at");
