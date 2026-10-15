import { describe, expect, it } from "vitest";

import {
  defaultHomepageSections,
  isHomepageSectionVisible,
  mergeHomepageSections,
  resolveHomepageSections
} from "./homepage-content";

describe("homepage content", () => {
  it("keeps every required slot available when the database is empty", () => {
    const content = mergeHomepageSections([]);

    expect(content.hero.title).toBe(defaultHomepageSections.hero.title);
    expect(content.audio_promo.ctaHref).toBe("/categories/audio");
    expect(content.power_promo.ctaHref).toBe("/categories/charging");
    expect(content.promise.title).toBe(defaultHomepageSections.promise.title);
  });

  it("uses database content for a slot while preserving the remaining defaults", () => {
    const content = mergeHomepageSections([
      {
        ...defaultHomepageSections.hero,
        title: "A scheduled campaign"
      }
    ]);

    expect(content.hero.title).toBe("A scheduled campaign");
    expect(content.promise.title).toBe(defaultHomepageSections.promise.title);
  });

  it("honours publication windows", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");
    const scheduled = {
      ...defaultHomepageSections.hero,
      startsAt: "2026-09-23T11:00:00.000Z",
      endsAt: "2026-09-23T12:00:00.000Z"
    };

    expect(isHomepageSectionVisible(scheduled, now)).toBe(false);
    expect(
      isHomepageSectionVisible(
        { ...scheduled, startsAt: "2026-09-23T09:00:00.000Z" },
        now
      )
    ).toBe(true);
    expect(isHomepageSectionVisible({ ...scheduled, isActive: false }, now)).toBe(false);
  });

  it("falls back safely outside a scheduled campaign window", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");
    const content = resolveHomepageSections(
      [{
        ...defaultHomepageSections.hero,
        title: "Future campaign",
        startsAt: "2026-09-23T11:00:00.000Z"
      }],
      now
    );

    expect(content.hero.title).toBe(defaultHomepageSections.hero.title);
  });
});
