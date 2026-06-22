import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { redirectSystemPath } from "@/app/+native-intent";

describe("redirectSystemPath", () => {
  beforeEach(() => {
    vi.stubGlobal("__DEV__", false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes root links with session_id to checkout success", () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: "ticketsystem:///?session_id=cs_test_123",
      }),
    ).toBe("/checkout/success?session_id=cs_test_123");
  });

  it("routes root links with provider reference to checkout success", () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: "ticketsystem:///?reference=paystack_ref_123",
      }),
    ).toBe("/checkout/success?reference=paystack_ref_123");
  });

  it("routes root links with trxref to checkout success", () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: "ticketsystem:///?trxref=paystack_ref_456",
      }),
    ).toBe("/checkout/success?trxref=paystack_ref_456");
  });

  it("routes root links with payment_intent to checkout success", () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: "ticketsystem:///?payment_intent=pi_123",
      }),
    ).toBe("/checkout/success?payment_intent=pi_123");
  });

  it("passes through known checkout routes with query params", () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: "ticketsystem:///checkout/success?orderId=order_123&payment_intent=pi_123",
      }),
    ).toBe("/checkout/success?orderId=order_123&payment_intent=pi_123");
  });
});
