import { describe, expect, it } from "vitest";

import { getCheckoutReturnSupportSubject } from "./checkout-return-support";

describe("getCheckoutReturnSupportSubject", () => {
  it("still prefers the order id for signed-out subjects when present", () => {
    expect(
      getCheckoutReturnSupportSubject({
        orderId: "order_123",
        recoveryLabel: "Payment intent",
        recoveryValue: "pi_123",
        signedOut: true,
      }),
    ).toBe("TicketSystem payment confirmation help for order_123");
  });

  it("prefers the order id when present", () => {
    expect(
      getCheckoutReturnSupportSubject({
        orderId: "order_123",
        recoveryLabel: "Payment intent",
        recoveryValue: "pi_123",
      }),
    ).toBe("TicketSystem payment confirmation help for order_123");
  });

  it("falls back to the recovery identifier when no order id exists", () => {
    expect(
      getCheckoutReturnSupportSubject({
        recoveryLabel: "Provider reference",
        recoveryValue: "cs_test_123",
      }),
    ).toBe("TicketSystem checkout return follow-up (Provider reference: cs_test_123)");
  });

  it("uses the sign-in help prefix for signed-out recovery subjects", () => {
    expect(
      getCheckoutReturnSupportSubject({
        recoveryLabel: "Payment intent",
        recoveryValue: "pi_123",
        signedOut: true,
      }),
    ).toBe("TicketSystem checkout return sign-in help (Payment intent: pi_123)");
  });

  it("uses the generic fallback when no identifiers exist", () => {
    expect(getCheckoutReturnSupportSubject({})).toBe(
      "TicketSystem checkout return follow-up",
    );
  });

  it("uses the generic signed-out fallback when no identifiers exist", () => {
    expect(getCheckoutReturnSupportSubject({ signedOut: true })).toBe(
      "TicketSystem checkout return sign-in help",
    );
  });
});
