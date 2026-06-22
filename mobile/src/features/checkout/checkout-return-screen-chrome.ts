export function getCheckoutReturnScreenChrome(input: {
  hasRecoveryIdentifier: boolean;
  isLookupError: boolean;
  mode: "cancel" | "success";
  signedIn?: boolean;
  status?: string | null;
}) {
  if (!input.signedIn) {
    return {
      subtitle: "Sign in again to reconnect this checkout result with your attendee wallet.",
      title: "Sign in required",
    };
  }

  if (input.mode === "cancel") {
    return {
      subtitle:
        "We are checking whether this checkout was cancelled or still needs confirmation.",
      title: "Checkout not completed",
    };
  }

  if (input.status === "CANCELLED") {
    return {
      subtitle: "This checkout did not complete, and no paid order was restored from this return.",
      title: "Checkout not completed",
    };
  }

  if (input.status === "PAID") {
    return {
      subtitle: "Your latest backend order state is confirmed and ready in the app.",
      title: "Payment confirmed",
    };
  }

  if (input.status === "PENDING") {
    return {
      subtitle: "We are still confirming the latest backend payment state for this order.",
      title: "Checking payment",
    };
  }

  if (input.isLookupError && input.hasRecoveryIdentifier) {
    return {
      subtitle: "Maya has your payment return details but could not refresh the latest order state yet.",
      title: "Payment return issue",
    };
  }

  if (input.hasRecoveryIdentifier) {
    return {
      subtitle: "Maya received your payment return details but has not matched them to an order yet.",
      title: "Payment return received",
    };
  }

  return {
    subtitle: "Maya did not receive enough return details to reconnect this payment automatically.",
    title: "Payment return incomplete",
  };
}
