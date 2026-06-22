import { describe, expect, it } from "vitest";

import {
  getCheckoutReturnCheckoutStatusLabel,
  getCheckoutReturnPaymentStatusLabel,
} from "./checkout-return-status";

describe("checkout return status labels", () => {
  it("defaults empty payment status to Paid", () => {
    expect(getCheckoutReturnPaymentStatusLabel(null)).toBe("Paid");
  });

  it("title-cases payment statuses", () => {
    expect(getCheckoutReturnPaymentStatusLabel("requires_action")).toBe("Requires Action");
  });

  it("defaults empty checkout status to Unknown", () => {
    expect(getCheckoutReturnCheckoutStatusLabel(null)).toBe("Unknown");
  });

  it("title-cases checkout statuses", () => {
    expect(getCheckoutReturnCheckoutStatusLabel("payment_failed")).toBe("Payment Failed");
  });
});
