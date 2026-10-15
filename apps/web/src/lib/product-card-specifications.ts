import { normalizeProductSpecifications } from "./product-specifications";

const preferredKeys = [
  "Capacity", "Output", "Power", "Ports", "Port", "Connector", "Connection",
  "Storage", "Memory", "Resolution", "Feature", "Technology", "Charging",
  "Included", "Colour", "Color", "Packaging rating", "Visible feature",
  "Visible ports", "Contact style", "Type", "Model", "Brand"
];

const compactLabels: Record<string, string> = {
  "Contact style": "Contacts",
  "Packaging rating": "Rated",
  "Visible feature": "Feature",
  "Visible ports": "Ports"
};

/** Short, factual highlights for compact product cards; never invent values. */
export function productCardSpecifications(value: unknown, productName = "", limit = 2) {
  const specifications = normalizeProductSpecifications(value);
  const entries = Object.entries(specifications).filter(([label, detail]) => {
    if (["Brand", "Model"].includes(label) && productName.toLowerCase().includes(detail.toLowerCase())) return false;
    if (label === "Type" && productName &&
        Object.keys(specifications).some((other) => !["Type", "Model", "Brand"].includes(other))) return false;
    return true;
  });
  entries.sort((a, b) => {
    const aRank = preferredKeys.indexOf(a[0]);
    const bRank = preferredKeys.indexOf(b[0]);
    return (aRank < 0 ? preferredKeys.length : aRank) -
      (bRank < 0 ? preferredKeys.length : bRank);
  });
  return entries.slice(0, limit).map(([label, detail]) => ({ label: compactLabels[label] ?? label, detail }));
}
