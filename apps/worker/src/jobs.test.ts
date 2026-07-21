import { describe, expect, it } from "vitest";

import type { TalomartJob } from "./jobs";

describe("Talomart jobs", () => {
  it("keeps payment callbacks explicitly named", () => {
    const job: TalomartJob = {
      name: "payment.callback",
      data: {
        checkoutRequestId: "ws_CO_123",
        resultCode: 0,
        resultDescription: "Success",
        metadata: {}
      }
    };

    expect(job.name).toBe("payment.callback");
  });
});
