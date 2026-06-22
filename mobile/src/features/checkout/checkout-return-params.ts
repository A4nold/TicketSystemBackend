export type CheckoutReturnParams = {
  orderId?: string;
  payment_intent?: string;
  reference?: string;
  session_id?: string;
  trxref?: string;
};

export function readCheckoutReturnIds(params: CheckoutReturnParams) {
  const orderId =
    typeof params.orderId === "string" && params.orderId.trim()
      ? params.orderId
      : undefined;
  const paymentIntentId =
    typeof params.payment_intent === "string" && params.payment_intent.trim()
      ? params.payment_intent
      : undefined;
  const checkoutSessionId =
    typeof params.session_id === "string" && params.session_id.trim()
      ? params.session_id
      : typeof params.reference === "string" && params.reference.trim()
        ? params.reference
        : typeof params.trxref === "string" && params.trxref.trim()
          ? params.trxref
          : undefined;

  return {
    checkoutSessionId,
    orderId,
    paymentIntentId,
  };
}
