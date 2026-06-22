export function getCheckoutReturnFailureCopy(input: {
  hasRecoveryIdentifier: boolean;
  isLookupError: boolean;
  mode: "cancel" | "success";
  status?: string | null;
}) {
  if (input.status === "CANCELLED") {
    return "This checkout did not complete, and no paid order is active in Maya for this return. You can go back to discovery, or contact support if you still saw a charge.";
  }

  if (input.isLookupError && input.hasRecoveryIdentifier) {
    return "We found your payment return details, but Maya could not refresh the latest order state just yet. Retry refresh or return to wallet while keeping this reference handy.";
  }

  if (input.hasRecoveryIdentifier) {
    return "We received your payment return, but could not match it to an in-app order yet. You can retry refresh or return to wallet while Maya keeps your account session intact.";
  }

  if (input.mode === "success") {
    return "Maya did not receive enough payment return details to reconnect this purchase automatically. Return to wallet or contact support before retrying the same payment.";
  }

  return "You can reopen discovery to choose a different event or return to wallet without losing your current account session.";
}
