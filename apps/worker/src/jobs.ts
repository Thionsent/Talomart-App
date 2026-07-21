export interface PaymentCallbackJob {
  checkoutRequestId: string;
  resultCode: number;
  resultDescription: string;
  metadata: Record<string, string | number>;
}

export interface OrderNotificationJob {
  orderId: string;
  channel: "email" | "sms";
  template: "order_received" | "payment_confirmed" | "order_dispatched";
}

export type TalomartJob =
  | { name: "payment.callback"; data: PaymentCallbackJob }
  | { name: "order.notification"; data: OrderNotificationJob };
