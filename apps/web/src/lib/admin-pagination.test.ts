import { describe, expect, it } from "vitest";

import { clampAdminPage, parseAdminPage } from "./admin-pagination";

describe("admin pagination", () => {
  it("rejects invalid or unsafe page numbers", () => {
    expect(parseAdminPage("2")).toBe(2);
    for (const input of ["", "0", "-1", "1.5", "abc", "999999999999999999999"]) {
      expect(parseAdminPage(input)).toBe(1);
    }
  });

  it("keeps hundreds of products reachable and clamps stale pages", () => {
    expect(clampAdminPage(1, 250, 24)).toBe(1);
    expect(clampAdminPage(8, 250, 24)).toBe(8);
    expect(clampAdminPage(99, 250, 24)).toBe(11);
    expect(clampAdminPage(3, 0, 24)).toBe(1);
  });
});
