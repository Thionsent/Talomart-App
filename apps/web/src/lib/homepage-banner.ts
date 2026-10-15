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

export function isHomepageBannerVisible(
  banner: HomepageBanner,
  now = new Date()
) {
  if (!banner.isActive) return false;
  if (banner.startsAt && new Date(banner.startsAt) > now) return false;
  if (banner.endsAt && new Date(banner.endsAt) <= now) return false;
  return true;
}
