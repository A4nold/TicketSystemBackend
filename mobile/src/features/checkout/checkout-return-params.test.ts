import { describe, expect, it } from "vitest";

import { readCheckoutReturnIds } from "./checkout-return-params";

describe("readCheckoutReturnIds", () => {
  it("reads order id directly when present", () => {
    expect(
      readCheckoutReturnIds({
        orderId: "order_123",
        payment_intent: "pi_123",
        session_id: "cs_test_123",
      }),
    ).toEqual({
      checkoutSessionId: "cs_test_123",
      orderId: "order_123",
      paymentIntentId: "pi_123",
    });
  });

  it("prefers session_id over reference-style fallbacks", () => {
    expect(
      readCheckoutReturnIds({
        reference: "pay_ref_123",
        session_id: "cs_test_123",
        trxref: "pay_ref_456",
      }),
    ).toEqual({
      checkoutSessionId: "cs_test_123",
      orderId: undefined,
      paymentIntentId: undefined,
    });
  });

  it("falls back from reference to trxref", () => {
    expect(
      readCheckoutReturnIds({
        reference: "pay_ref_123",
        trxref: "pay_ref_456",
      }),
    ).toEqual({
      checkoutSessionId: "pay_ref_123",
      orderId: undefined,
      paymentIntentId: undefined,
    });
  });

  it("uses trxref when reference is absent", () => {
    expect(
      readCheckoutReturnIds({
        trxref: "pay_ref_456",
      }),
    ).toEqual({
      checkoutSessionId: "pay_ref_456",
      orderId: undefined,
      paymentIntentId: undefined,
    });
  });

  it("ignores empty strings", () => {
    expect(
      readCheckoutReturnIds({
        orderId: "   ",
        payment_intent: "",
        reference: " ",
        session_id: "",
        trxref: "   ",
      }),
    ).toEqual({
      checkoutSessionId: undefined,
      orderId: undefined,
      paymentIntentId: undefined,
    });
  });
});
