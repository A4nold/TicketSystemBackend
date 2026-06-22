export function getCheckoutReturnSupportBody(input: {
  mode: "cancel" | "success";
  orderId?: string | null;
  recoveryLabel?: string | null;
  recoveryValue?: string | null;
  signedOut?: boolean;
}) {
  if (input.signedOut) {
    if (input.orderId) {
      return `If you cannot reconnect this checkout result after signing in again, contact support with order ${input.orderId}.`;
    }

    if (input.recoveryLabel && input.recoveryValue) {
      return `If you cannot reconnect this checkout result after signing in again, contact support with ${input.recoveryLabel.toLowerCase()} ${input.recoveryValue}.`;
    }

    return "If you cannot reconnect this checkout result after signing in again, contact support with any order or payment reference you have.";
  }

  if (input.orderId) {
    return `If payment remains pending and the wallet still does not update, contact support with order ${input.orderId} before retrying multiple purchases.`;
  }

  if (input.recoveryLabel && input.recoveryValue) {
    return `If you saw a bank or card charge but Maya still could not confirm this return, contact support with ${input.recoveryLabel.toLowerCase()} ${input.recoveryValue} before trying the same purchase again.`;
  }

  if (input.mode === "success") {
    return "If you completed payment outside the app but Maya could not reconnect the return details, contact support before trying the same purchase again.";
  }

  return "If you saw a bank or card charge but this screen did not confirm payment, contact support before trying the same purchase again.";
}
