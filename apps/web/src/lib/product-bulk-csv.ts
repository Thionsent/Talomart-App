export const productCsvColumns = [
  "sku",
  "name",
  "slug",
  "categorySlug",
  "categoryName",
  "price",
  "compareAtPrice",
  "stockQuantity",
  "reservedQuantity",
  "lowStockThreshold",
  "isActive",
  "isFeatured",
  "shortDescription",
  "description",
  "imageUrl",
  "specifications"
] as const;

export type ProductCsvColumn = (typeof productCsvColumns)[number];
export type ProductCsvRow = Record<ProductCsvColumn, string>;

export function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function stringifyCsv(rows: Record<string, unknown>[]) {
  return [
    productCsvColumns.join(","),
    ...rows.map((row) =>
      productCsvColumns.map((column) => escapeCsvCell(row[column])).join(",")
    )
  ].join("\r\n");
}

export function parseCsv(csv: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  const nonEmptyRows = rows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );
  const [headerRow, ...dataRows] = nonEmptyRows;

  if (!headerRow?.length) {
    return [];
  }

  const normalizedHeaders = headerRow.map((header) => header.trim());
  const unknownHeaders = normalizedHeaders.filter(
    (header) => !productCsvColumns.includes(header as ProductCsvColumn)
  );

  if (unknownHeaders.length) {
    throw new Error(`Unknown CSV columns: ${unknownHeaders.join(", ")}`);
  }

  return dataRows.map((row) => {
    const item = Object.fromEntries(
      productCsvColumns.map((column) => [column, ""])
    ) as ProductCsvRow;

    normalizedHeaders.forEach((header, index) => {
      item[header as ProductCsvColumn] = row[index]?.trim() ?? "";
    });

    return item;
  });
}

export function specificationsFromCsv(value: string) {
  if (!value.trim()) return {};

  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, itemValue]) => [
          key,
          String(itemValue ?? "")
        ])
      );
    }
  } catch {
    // Fall through to line-based parsing.
  }

  const specifications: Record<string, string> = {};

  for (const line of value.split(/\r?\n|;/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const separator = trimmedLine.includes(":") ? ":" : "=";
    const [rawKey, ...rest] = trimmedLine.split(separator);
    const key = rawKey?.trim();
    const specificationValue = rest.join(separator).trim();

    if (key && specificationValue) {
      specifications[key] = specificationValue;
    }
  }

  return specifications;
}

export function specificationsToCsv(value: Record<string, string>) {
  return JSON.stringify(value ?? {});
}

