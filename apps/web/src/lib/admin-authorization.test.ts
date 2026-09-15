import { describe, expect, it } from "vitest";

import {
  permissionForAdminView,
  staffPermissionValues
} from "./admin-authorization";

describe("administrator permission scopes", () => {
  it("keeps catalogue and inventory mutations in separate scopes", () => {
    expect(permissionForAdminView("products")).toBe("catalog.manage");
    expect(permissionForAdminView("categories")).toBe("catalog.manage");
    expect(permissionForAdminView("inventory")).toBe("inventory.manage");
  });

  it("uses separate customer, order and analytics read boundaries", () => {
    expect(permissionForAdminView("orders")).toBe("orders.manage");
    expect(permissionForAdminView("customers")).toBe("customers.read");
    expect(permissionForAdminView("analytics")).toBe("analytics.read");
  });

  it("exposes explicit staff-management and audit permissions", () => {
    expect(staffPermissionValues).toContain("staff.manage");
    expect(staffPermissionValues).toContain("audit.read");
  });
});
