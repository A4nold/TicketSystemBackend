import { describe, expect, it } from "vitest";

import {
  extractCheckoutReturnParams,
  matchesCheckoutPath,
} from "./paystack-inline-return";

describe("paystack-inline-checkout helpers", () => {
  it("matches checkout success path from absolute urls", () => {
    expect(
      matchesCheckoutPath(
        "https://checkout.maya.app/checkout/success?orderId=order_123",
        "/checkout/success",
      ),
    ).toBe(true);
  });

  it("falls back to substring matching for malformed urls", () => {
    expect(matchesCheckoutPath("/checkout/cancel?orderId=order_123", "/checkout/cancel")).toBe(
      true,
    );
  });

  it("extracts order, reference, and session params from return urls", () => {
    expect(
      extractCheckoutReturnParams(
        "ticketsystem:///checkout/success?orderId=order_123&reference=pay_ref_123&session_id=cs_test_123",
      ),
    ).toEqual({
      orderId: "order_123",
      reference: "pay_ref_123",
      session_id: "cs_test_123",
    });
  });

  it("uses trxref as a fallback provider reference", () => {
    expect(
      extractCheckoutReturnParams(
        "ticketsystem:///checkout/success?trxref=pay_ref_456",
      ),
    ).toEqual({
      orderId: undefined,
      reference: "pay_ref_456",
      session_id: undefined,
    });
  });

  it("returns empty params for invalid urls", () => {
    expect(extractCheckoutReturnParams("not a url")).toEqual({
      orderId: undefined,
      reference: undefined,
      session_id: undefined,
    });
  });
});
