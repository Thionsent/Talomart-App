# Homepage content management

Talomart's homepage content is managed from `/admin/homepage`. Fixed content slots are stored in `homepage_sections`; rotating campaign banners are stored in `homepage_banners`. The page supports the hero, audio promotion, power promotion and Talomart promise slots, a curated list of up to twelve featured active products, and any number of scheduled banners.

## Campaign banners

- Use **Add a banner** to upload JPG, PNG, WebP or AVIF artwork (maximum 5MB per image), or provide local/HTTPS image URLs.
- Upload a landscape desktop image at about 1800 × 720 pixels. For the best phone presentation, also upload a portrait mobile image at about 900 × 1200 pixels. The desktop artwork is used as a fallback when mobile artwork is omitted.
- The horizontal and vertical focus controls keep the important subject visible when the browser crops artwork. Always provide meaningful alternative text.
- Lower display-order numbers appear first in the carousel.
- `Navy`, `green` and `light` treatments adjust the text overlay to suit the artwork.
- A banner appears only when it is published and falls within its optional start/end window.
- Archiving is deliberately non-destructive: it removes the banner from the storefront while preserving its content and audit history.
- Published banners replace the legacy homepage hero; the legacy hero remains as a safe fallback when no banner is currently visible.
- When multiple banners are visible, the storefront rotates them automatically, with customer-controlled arrows, dots and touch swipes. Rotation pauses during interaction and for visitors who prefer reduced motion.

## Publishing rules

- Only administrators and staff with `homepage.manage` can change content.
- Every content change is recorded in the administrator audit log.
- A section must be published before customers can see it.
- A banner must be published and inside its schedule before customers can see it.
- Optional start and end times allow campaigns to be scheduled in advance.
- CTA destinations must be internal paths, anchors or HTTPS URLs.
- A CTA label and destination must be supplied together.
- The storefront keeps the last valid/default content available if the database is temporarily unavailable.

## Release procedure

1. Apply the latest database migrations in staging and verify the homepage and `/admin/homepage`.
2. Create or update content with approved copy, images, prices and policy claims.
3. Preview the homepage from the CMS page at desktop and mobile widths.
4. Verify every CTA, image, schedule and featured product.
5. Review the resulting audit event.
6. Apply the migration and publish the same approved content in production.

Do not use unsupported customer counts, ratings, warranty terms, discounts or delivery promises. The homepage must match the approved catalogue and published policies.
