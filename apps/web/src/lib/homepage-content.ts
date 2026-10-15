export const homepageSectionSlots = [
  "hero",
  "audio_promo",
  "power_promo",
  "promise"
] as const;

export type HomepageSectionSlot = (typeof homepageSectionSlots)[number];

export type HomepageSection = {
  id?: string;
  slot: HomepageSectionSlot;
  eyebrow: string | null;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

export const defaultHomepageSections: Record<HomepageSectionSlot, HomepageSection> = {
  hero: {
    slot: "hero",
    eyebrow: "TECH FOR EVERYDAY LIFE",
    title: "Find the tech that fits your day.",
    body: "Explore phones and useful accessories from Talomart Stores, with clear prices and help when you need it.",
    imageUrl:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=750&q=90",
    ctaLabel: "Browse products",
    ctaHref: "/products",
    isActive: true,
    sortOrder: 0,
    startsAt: null,
    endsAt: null
  },
  audio_promo: {
    slot: "audio_promo",
    eyebrow: "PURE SOUND",
    title: "Hear every detail.",
    body: "Headphones, earbuds and speakers for your everyday listening.",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85",
    ctaLabel: "Shop audio",
    ctaHref: "/categories/audio",
    isActive: true,
    sortOrder: 10,
    startsAt: null,
    endsAt: null
  },
  power_promo: {
    slot: "power_promo",
    eyebrow: "STAY CHARGED",
    title: "Power that travels.",
    body: "Chargers and power banks for busy days.",
    imageUrl: null,
    ctaLabel: "Shop power",
    ctaHref: "/categories/charging",
    isActive: true,
    sortOrder: 20,
    startsAt: null,
    endsAt: null
  },
  promise: {
    slot: "promise",
    eyebrow: "THE TALOMART PROMISE",
    title: "Tech shopping, without the guesswork.",
    body: "From your first click to unboxing, we make every step simple, secure and satisfying.",
    imageUrl: null,
    ctaLabel: "Get to know Talomart",
    ctaHref: "/about",
    isActive: true,
    sortOrder: 30,
    startsAt: null,
    endsAt: null
  }
};

export function mergeHomepageSections(rows: HomepageSection[]) {
  const bySlot = new Map(rows.map((row) => [row.slot, row]));
  return homepageSectionSlots.reduce(
    (sections, slot) => {
      sections[slot] = bySlot.get(slot) ?? defaultHomepageSections[slot];
      return sections;
    },
    {} as Record<HomepageSectionSlot, HomepageSection>
  );
}

export function isHomepageSectionVisible(
  section: HomepageSection,
  now = new Date()
) {
  if (!section.isActive) return false;
  if (section.startsAt && new Date(section.startsAt) > now) return false;
  if (section.endsAt && new Date(section.endsAt) <= now) return false;
  return true;
}

/**
 * Resolve a single-row CMS slot safely for the storefront. A scheduled row
 * should never leave a blank hero while it is waiting to start or after it
 * expires, so the approved default is used outside its publication window.
 * An explicitly unpublished row remains unpublished.
 */
export function resolveHomepageSections(rows: HomepageSection[], now = new Date()) {
  const merged = mergeHomepageSections(rows);

  return homepageSectionSlots.reduce(
    (sections, slot) => {
      const section = merged[slot];
      const scheduledOutsideWindow =
        (section.startsAt && new Date(section.startsAt) > now) ||
        (section.endsAt && new Date(section.endsAt) <= now);

      sections[slot] =
        section.isActive && scheduledOutsideWindow
          ? defaultHomepageSections[slot]
          : section;
      return sections;
    },
    {} as Record<HomepageSectionSlot, HomepageSection>
  );
}
