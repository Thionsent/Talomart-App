import { describe, expect, it } from "vitest";

import { normalizeProductSpecifications } from "./product-specifications";

describe("normalizeProductSpecifications", () => {
  it("keeps valid specification objects", () => {
    expect(normalizeProductSpecifications({ Brand: "Amaya", Model: "A-AD032" })).toEqual({ Brand: "Amaya", Model: "A-AD032" });
  });

  it("repairs legacy JSON text without splitting it into characters", () => {
    expect(normalizeProductSpecifications('{"Brand":"Amaya","Ports":"2 USB-A"}')).toEqual({ Brand: "Amaya", Ports: "2 USB-A" });
  });

  it("rejects malformed or non-object data", () => {
    expect(normalizeProductSpecifications("not JSON")).toEqual({});
    expect(normalizeProductSpecifications('["a","b"]')).toEqual({});
    expect(normalizeProductSpecifications({ Brand: 2, Model: "A-AD032" })).toEqual({ Model: "A-AD032" });
    expect(normalizeProductSpecifications({ 0: "{", 1: '"', 2: "B" })).toEqual({});
  });
});
