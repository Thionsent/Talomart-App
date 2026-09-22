import { describe, expect, it } from "vitest";

import { buildAuthTrustedOrigins } from "./auth-origins";

describe("buildAuthTrustedOrigins", () => {
  it("trusts the configured app and exact Vercel deployment aliases", () => {
    expect(
      buildAuthTrustedOrigins("https://talomart-app-web.vercel.app/", {
        deploymentUrl: "talomart-app-iwxo4dbfr.vercel.app",
        branchUrl: "talomart-app-web-git-production-rebuild.vercel.app",
        productionUrl: "talomart-app-web.vercel.app"
      })
    ).toEqual([
      "https://talomart-app-web.vercel.app",
      "https://talomart-app-iwxo4dbfr.vercel.app",
      "https://talomart-app-web-git-production-rebuild.vercel.app"
    ]);
  });

  it("ignores malformed values instead of weakening origin validation", () => {
    expect(
      buildAuthTrustedOrigins("http://localhost:3000", {
        branchUrl: "not a valid host/path with spaces"
      })
    ).toEqual(["http://localhost:3000"]);
  });
});
