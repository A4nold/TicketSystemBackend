export function getCheckoutReturnFailureHeading(input: {
  hasRecoveryIdentifier: boolean;
  isLookupError: boolean;
  mode: "cancel" | "success";
  status?: string | null;
}) {
  if (input.status === "CANCELLED") {
    return {
      eyebrow: "Checkout not completed",
      title: "This purchase was not completed.",
    };
  }

  if (input.mode === "success") {
    if (input.isLookupError && input.hasRecoveryIdentifier) {
      return {
        eyebrow: "Payment return issue",
        title: "We could not refresh this purchase yet.",
      };
    }

    if (input.hasRecoveryIdentifier) {
      return {
        eyebrow: "Payment return received",
        title: "We could not reconnect this purchase yet.",
      };
    }

    return {
      eyebrow: "Payment return incomplete",
      title: "We need a bit more context to confirm this purchase.",
    };
  }

  return {
    eyebrow: "Checkout not completed",
    title: "No charge was confirmed in the app.",
  };
}
