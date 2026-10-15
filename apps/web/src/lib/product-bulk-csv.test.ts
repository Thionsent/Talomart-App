import { describe, expect, it } from "vitest";

import { parseCsv } from "./product-bulk-csv";

const header = "sku,name,slug,categorySlug,price,stockQuantity";

describe("product CSV parsing", () => {
  it("reads a valid minimal CSV", () => {
    expect(parseCsv(`${header}\nTLM-1,Charger,charger,charging,200,4`)[0]).toMatchObject({
      sku: "TLM-1",
      categorySlug: "charging",
      stockQuantity: "4"
    });
  });

  it("rejects missing or duplicated required columns", () => {
    expect(() => parseCsv("sku,name,slug,price,stockQuantity\nTLM-1,C,c,200,1"))
      .toThrow("Missing required CSV column: categorySlug");
    expect(() => parseCsv(`${header},sku\nTLM-1,C,c,charging,200,1,TLM-2`))
      .toThrow("Duplicate CSV columns: sku");
  });

  it("rejects malformed rows", () => {
    expect(() => parseCsv(`${header}\nTLM-1,C,c,charging,200,1,extra`))
      .toThrow("more values than CSV columns");
    expect(() => parseCsv(`${header}\nTLM-1,\"unfinished,c,charging,200,1`))
      .toThrow("unfinished quoted value");
  });
});
