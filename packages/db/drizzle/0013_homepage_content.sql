ALTER TYPE "staff_permission" ADD VALUE IF NOT EXISTS 'homepage.manage';--> statement-breakpoint

CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot" text NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"body" text,
	"image_url" text,
	"cta_label" text,
	"cta_href" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_section_slot_unique" ON "homepage_sections" USING btree ("slot");--> statement-breakpoint
CREATE INDEX "homepage_section_schedule_idx" ON "homepage_sections" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint

INSERT INTO "homepage_sections" (
	"slot", "eyebrow", "title", "body", "image_url", "cta_label", "cta_href", "sort_order"
)
VALUES
	('hero', 'SMART TECH. SMARTER PRICES.', 'Power up your everyday.', 'Genuine phones and accessories, picked for performance and priced for real life.', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=750&q=90', 'Shop latest tech', '/products', 0),
	('audio_promo', 'PURE SOUND', 'Hear every detail.', 'Up to 35% off audio', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85', 'Shop audio', '/categories/audio', 10),
	('power_promo', 'STAY CHARGED', 'Power that travels.', 'From KSh 1,299', NULL, 'Shop power', '/categories/charging', 20),
	('promise', 'THE TALOMART PROMISE', 'Tech shopping, without the guesswork.', 'From your first click to unboxing, we make every step simple, secure and satisfying.', NULL, 'Why shop with us?', '#why', 30)
ON CONFLICT ("slot") DO NOTHING;
