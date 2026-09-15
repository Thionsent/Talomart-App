type CheckoutIssue = {
  path?: unknown;
  message?: unknown;
};

const fieldLabels: Record<string, string> = {
  recipientName: "Recipient name",
  phone: "Phone number",
  county: "County",
  town: "Town / Estate",
  deliveryAddress: "Delivery address",
  customerNote: "Customer note",
  paymentMethod: "Payment method"
};

export function getCheckoutErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Checkout failed. Please try again.";
  }

  const response = payload as { error?: unknown; issues?: unknown };
  const issues = Array.isArray(response.issues)
    ? (response.issues as CheckoutIssue[])
    : [];
  const firstIssue = issues[0];

  if (firstIssue) {
    const path = Array.isArray(firstIssue.path)
      ? firstIssue.path.map(String)
      : [];
    const message =
      typeof firstIssue.message === "string"
        ? firstIssue.message
        : "Invalid value.";

    if (path[0] === "items") {
      return "Your cart contains an unavailable product. Remove it and add it again from the live catalogue.";
    }

    const fieldName = path.at(-1);
    const label = fieldName ? fieldLabels[fieldName] : undefined;
    if (label) return `${label}: ${message}`;

    return message;
  }

  return typeof response.error === "string"
    ? response.error
    : "Checkout failed. Please try again.";
}

