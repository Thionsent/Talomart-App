import { describe, expect, it } from "vitest";

import { productCardSpecifications } from "./product-card-specifications";

describe("productCardSpecifications", () => {
  it("prefers useful features to brand and model on compact cards", () => {
    expect(productCardSpecifications({ Brand: "Amaya", Model: "A-AD032", Ports: "2 USB-A", "Packaging rating": "3.1A" }, "Amaya A-AD032 Charger")).toEqual([
      { label: "Ports", detail: "2 USB-A" },
      { label: "Rated", detail: "3.1A" }
    ]);
  });

  it("omits a redundant product type when a more helpful specification exists", () => {
    expect(productCardSpecifications({ Type: "Universal battery charger", "Contact style": "Adjustable pins" }, "Seven Color Universal Charger")).toEqual([
      { label: "Contacts", detail: "Adjustable pins" }
    ]);
  });

  it("does not render characters from malformed JSON", () => {
    expect(productCardSpecifications({ 0: "{", 1: '"', 2: "B" })).toEqual([]);
  });

  it("leaves products without confirmed specifications empty", () => {
    expect(productCardSpecifications({})).toEqual([]);
  });
});
