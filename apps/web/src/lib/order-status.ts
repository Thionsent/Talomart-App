export const orderStatusValues = [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
] as const;

export type OrderStatus = (typeof orderStatusValues)[number];

export const fulfillmentStatusValues = [
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "returned"
] as const;

export type FulfillmentStatus = (typeof fulfillmentStatusValues)[number];

export const customerOrderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  payment_confirmed: "Order confirmed",
  processing: "Preparing your order",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned"
};

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["payment_confirmed", "processing", "cancelled"],
  payment_confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: []
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus
) {
  return current === next || allowedTransitions[current].includes(next);
}

export function assertOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus
) {
  if (canTransitionOrderStatus(current, next)) return;

  throw new Error(
    `Order status cannot move from ${customerOrderStatusLabels[current]} to ${customerOrderStatusLabels[next]}.`
  );
}

export function orderStatusForFulfillment(
  fulfillmentStatus: FulfillmentStatus
): OrderStatus {
  if (fulfillmentStatus === "shipped") return "out_for_delivery";
  return fulfillmentStatus;
}

export function customerPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Payment pending",
    processing: "Payment processing",
    paid: "Paid",
    failed: "Payment unsuccessful",
    refunded: "Refunded"
  };
  return labels[status] ?? "Payment pending";
}
