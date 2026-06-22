export function matchesCheckoutPath(
  urlValue: string,
  pathname: "/checkout/success" | "/checkout/cancel",
) {
  try {
    return new URL(urlValue).pathname === pathname;
  } catch {
    return urlValue.includes(pathname);
  }
}

export function extractCheckoutReturnParams(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const orderId = parsed.searchParams.get("orderId") ?? undefined;
    const reference =
      parsed.searchParams.get("reference") ??
      parsed.searchParams.get("trxref") ??
      undefined;
    const sessionId = parsed.searchParams.get("session_id") ?? undefined;

    return {
      orderId,
      reference,
      session_id: sessionId,
    };
  } catch {
    return {
      orderId: undefined,
      reference: undefined,
      session_id: undefined,
    };
  }
}
