import { describe, expect, it } from "vitest";

import { isHomepageBannerVisible, type HomepageBanner } from "./homepage-banner";

const banner: HomepageBanner = {
  id: "14d5c444-e8f3-40e2-a908-a14635f4701f",
  name: "Launch",
  eyebrow: "New",
  title: "Launch offer",
  body: null,
  imageUrl: "/banner.jpg",
  mobileImageUrl: null,
  altText: "Featured products",
  ctaLabel: "Shop now",
  ctaHref: "/products",
  tone: "navy",
  isActive: true,
  sortOrder: 0,
  focalPointX: 50,
  focalPointY: 50,
  startsAt: null,
  endsAt: null
};

describe("homepage banners", () => {
  it("shows an active banner inside its publication window", () => {
    expect(isHomepageBannerVisible(banner)).toBe(true);
    expect(
      isHomepageBannerVisible(
        {
          ...banner,
          startsAt: "2026-09-23T09:00:00.000Z",
          endsAt: "2026-09-23T11:00:00.000Z"
        },
        new Date("2026-09-23T10:00:00.000Z")
      )
    ).toBe(true);
  });

  it("hides unpublished, future and expired banners", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");

    expect(isHomepageBannerVisible({ ...banner, isActive: false }, now)).toBe(false);
    expect(
      isHomepageBannerVisible(
        { ...banner, startsAt: "2026-09-23T11:00:00.000Z" },
        now
      )
    ).toBe(false);
    expect(
      isHomepageBannerVisible(
        { ...banner, endsAt: "2026-09-23T09:00:00.000Z" },
        now
      )
    ).toBe(false);
  });
});
