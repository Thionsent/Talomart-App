export function normalizeProductSpecifications(value: unknown): Record<string, string> {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        Boolean(entry[0].trim()) && !/^\d+$/.test(entry[0]) && typeof entry[1] === "string" && Boolean(entry[1].trim())
    )
  );
}
