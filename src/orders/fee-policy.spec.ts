import { afterEach, describe, expect, it } from "vitest";

import { resolveFeePolicy } from "./fee-policy";

describe("resolveFeePolicy", () => {
  afterEach(() => {
    delete process.env.CHECKOUT_FEE_PERCENT_RATE;
    delete process.env.CHECKOUT_FEE_PERCENT_RATE_EUR;
    delete process.env.CHECKOUT_FEE_PERCENT_RATE_NGN;
    delete process.env.CHECKOUT_FEE_FIXED_AMOUNT;
    delete process.env.CHECKOUT_FEE_FIXED_AMOUNT_EUR;
    delete process.env.CHECKOUT_FEE_FIXED_AMOUNT_NGN;
  });

  it("uses currency-specific overrides when they exist", () => {
    process.env.CHECKOUT_FEE_PERCENT_RATE = "0.0495";
    process.env.CHECKOUT_FEE_FIXED_AMOUNT = "0.49";
    process.env.CHECKOUT_FEE_FIXED_AMOUNT_NGN = "0.00";

    const eurPolicy = resolveFeePolicy("EUR");
    const ngnPolicy = resolveFeePolicy("NGN");

    expect(eurPolicy.percentRate.toString()).toBe("0.0495");
    expect(eurPolicy.fixedAmount.toFixed(2)).toBe("0.49");
    expect(ngnPolicy.percentRate.toString()).toBe("0.0495");
    expect(ngnPolicy.fixedAmount.toFixed(2)).toBe("0.00");
  });

  it("falls back to the global values when a currency override is missing", () => {
    process.env.CHECKOUT_FEE_PERCENT_RATE = "0.0495";
    process.env.CHECKOUT_FEE_FIXED_AMOUNT = "0.49";

    const policy = resolveFeePolicy("GBP");

    expect(policy.percentRate.toString()).toBe("0.0495");
    expect(policy.fixedAmount.toFixed(2)).toBe("0.49");
  });
});
