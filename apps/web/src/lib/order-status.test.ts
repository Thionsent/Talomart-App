import { describe, expect, it } from "vitest";

import {
  assertOrderStatusTransition,
  canTransitionOrderStatus,
  customerOrderStatusLabels,
  orderStatusForFulfillment
} from "./order-status";

describe("order status lifecycle", () => {
  it("allows the normal forward fulfilment lifecycle", () => {
    expect(canTransitionOrderStatus("payment_confirmed", "processing")).toBe(true);
    expect(canTransitionOrderStatus("processing", "packed")).toBe(true);
    expect(canTransitionOrderStatus("packed", "out_for_delivery")).toBe(true);
    expect(canTransitionOrderStatus("out_for_delivery", "delivered")).toBe(true);
  });

  it("allows a status to be saved without changing it", () => {
    expect(canTransitionOrderStatus("processing", "processing")).toBe(true);
  });

  it("rejects backwards and terminal transitions", () => {
    expect(() =>
      assertOrderStatusTransition("delivered", "processing")
    ).toThrow(/cannot move/);
    expect(canTransitionOrderStatus("cancelled", "processing")).toBe(false);
    expect(canTransitionOrderStatus("returned", "delivered")).toBe(false);
  });

  it("maps fulfilment status to the customer order lifecycle", () => {
    expect(orderStatusForFulfillment("shipped")).toBe("out_for_delivery");
    expect(orderStatusForFulfillment("delivered")).toBe("delivered");
  });

  it("provides customer-friendly labels", () => {
    expect(customerOrderStatusLabels.payment_confirmed).toBe("Order confirmed");
    expect(customerOrderStatusLabels.out_for_delivery).toBe("Out for delivery");
  });
});
