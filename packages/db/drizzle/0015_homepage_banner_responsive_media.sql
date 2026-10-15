ALTER TABLE "homepage_banners"
  ADD COLUMN IF NOT EXISTS "mobile_image_url" text,
  ADD COLUMN IF NOT EXISTS "focal_point_x" integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "focal_point_y" integer NOT NULL DEFAULT 50;

ALTER TABLE "homepage_banners"
  DROP CONSTRAINT IF EXISTS "homepage_banner_focal_point_x_check",
  ADD CONSTRAINT "homepage_banner_focal_point_x_check"
    CHECK ("focal_point_x" BETWEEN 0 AND 100),
  DROP CONSTRAINT IF EXISTS "homepage_banner_focal_point_y_check",
  ADD CONSTRAINT "homepage_banner_focal_point_y_check"
    CHECK ("focal_point_y" BETWEEN 0 AND 100);
