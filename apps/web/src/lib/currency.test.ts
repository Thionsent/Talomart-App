import { describe, expect, it } from "vitest";

import { formatMoney } from "./currency";

describe("formatMoney", () => {
  it("formats integer minor units without floating point arithmetic", () => {
    expect(formatMoney(2299900)).toContain("22,999");
  });
});
