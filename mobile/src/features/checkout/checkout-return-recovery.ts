export function getCheckoutRecoverySummary(input: {
  checkoutSessionId?: string;
  paymentIntentId?: string;
}) {
  if (input.checkoutSessionId) {
    return {
      label: "Provider reference",
      value: input.checkoutSessionId,
    };
  }

  if (input.paymentIntentId) {
    return {
      label: "Payment intent",
      value: input.paymentIntentId,
    };
  }

  return null;
}
