export function getCheckoutReturnSupportSubject(input: {
  orderId?: string | null;
  recoveryLabel?: string | null;
  recoveryValue?: string | null;
  signedOut?: boolean;
}) {
  if (input.orderId) {
    return `TicketSystem payment confirmation help for ${input.orderId}`;
  }

  if (input.recoveryLabel && input.recoveryValue) {
    const prefix = input.signedOut
      ? "TicketSystem checkout return sign-in help"
      : "TicketSystem checkout return follow-up";
    return `${prefix} (${input.recoveryLabel}: ${input.recoveryValue})`;
  }

  return input.signedOut
    ? "TicketSystem checkout return sign-in help"
    : "TicketSystem checkout return follow-up";
}
