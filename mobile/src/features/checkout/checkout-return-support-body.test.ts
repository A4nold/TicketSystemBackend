import { describe, expect, it } from "vitest";

import { getCheckoutReturnSupportBody } from "./checkout-return-support-body";

describe("getCheckoutReturnSupportBody", () => {
  it("prefers the order id for signed-out support guidance when available", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        orderId: "order_123",
        recoveryLabel: "Payment intent",
        recoveryValue: "pi_123",
        signedOut: true,
      }),
    ).toContain("order order_123");
  });

  it("uses recovery details for signed-out support guidance when available", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        recoveryLabel: "Payment intent",
        recoveryValue: "pi_123",
        signedOut: true,
      }),
    ).toContain("payment intent pi_123");
  });

  it("falls back to the generic signed-out guidance when no identifiers exist", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        signedOut: true,
      }),
    ).toContain("any order or payment reference");
  });

  it("uses the order id for pending-order support guidance", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        orderId: "order_123",
      }),
    ).toContain("order order_123");
  });

  it("still prefers the order id over recovery details on failure guidance", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        orderId: "order_123",
        recoveryLabel: "Provider reference",
        recoveryValue: "cs_test_123",
      }),
    ).toContain("order order_123");
  });

  it("uses recovery details for unmatched return guidance", () => {
    expect(
      getCheckoutReturnSupportBody({
        mode: "success",
        recoveryLabel: "Provider reference",
        recoveryValue: "cs_test_123",
      }),
    ).toContain("provider reference cs_test_123");
  });
});
