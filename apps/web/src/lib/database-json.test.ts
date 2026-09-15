import { describe, expect, it } from "vitest";

import { serializeDatabaseJson } from "./database-json";

describe("database JSON serialization", () => {
  it("serializes objects before they are passed to the Postgres driver", () => {
    const payload = { CheckoutRequestID: "ws_CO_test", ResponseCode: "0" };

    expect(serializeDatabaseJson(payload)).toBe(JSON.stringify(payload));
    expect(typeof serializeDatabaseJson(payload)).toBe("string");
  });

  it("rejects values that JSON cannot represent", () => {
    expect(() => serializeDatabaseJson(undefined)).toThrow(
      "Database JSON values must be JSON-serializable."
    );
  });
});
