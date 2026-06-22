import { describe, expect, it } from "vitest";

import { getCheckoutRecoverySummary } from "./checkout-return-recovery";

describe("getCheckoutRecoverySummary", () => {
  it("prefers provider reference when a checkout session id exists", () => {
    expect(
      getCheckoutRecoverySummary({
        checkoutSessionId: "cs_test_123",
        paymentIntentId: "pi_123",
      }),
    ).toEqual({
      label: "Provider reference",
      value: "cs_test_123",
    });
  });

  it("falls back to payment intent when no checkout session id exists", () => {
    expect(
      getCheckoutRecoverySummary({
        paymentIntentId: "pi_123",
      }),
    ).toEqual({
      label: "Payment intent",
      value: "pi_123",
    });
  });

  it("returns null when no recovery identifier exists", () => {
    expect(getCheckoutRecoverySummary({})).toBeNull();
  });
});
