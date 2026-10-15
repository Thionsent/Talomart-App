export const homepageBannerTones = ["navy", "green", "light"] as const;

export type HomepageBannerTone = (typeof homepageBannerTones)[number];

export type HomepageBanner = {
  id: string;
  name: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  altText: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  tone: HomepageBannerTone;
  isActive: boolean;
  sortOrder: number;
  focalPointX: number;
  focalPointY: number;
  startsAt: string | null;
  endsAt: string | null;
};

/** Existing CMS campaigns still point at PNGs; use their smaller display copies. */
const optimizedBuiltInBanners = new Set([
  "talomart-everyday-tech",
  "talomart-power-essentials",
  "talomart-audio-creator"
]);

export function storefrontBannerImageUrl(url: string): string {
  const match = /^\/images\/homepage\/(talomart-[a-z-]+?)(-mobile)?\.png$/.exec(url);
  return match?.[1] && optimizedBuiltInBanners.has(match[1])
    ? `${url.slice(0, -4)}.webp`
    : url;
}

export function isHomepageBannerVisible(
  banner: HomepageBanner,
  now = new Date()
) {
  if (!banner.isActive) return false;
  if (banner.startsAt && new Date(banner.startsAt) > now) return false;
  if (banner.endsAt && new Date(banner.endsAt) <= now) return false;
  return true;
}
