import { PaymentProvider } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { deriveOrganizerPayoutRegion, normalizeOrganizerCountry } from "./organizer-payout-region";

describe("organizer payout region", () => {
  it("normalizes valid country codes", () => {
    expect(normalizeOrganizerCountry("ng")).toBe("NG");
    expect(normalizeOrganizerCountry(" IE ")).toBe("IE");
  });

  it("maps supported countries to default payout currencies", () => {
    expect(
      deriveOrganizerPayoutRegion({
        country: "GB",
        paystackOrganizerEnabled: false,
      }),
    ).toEqual({
      country: "GB",
      defaultPayoutCurrency: "GBP",
      recommendedProvider: PaymentProvider.STRIPE,
    });
  });

  it("still recommends Paystack for Nigeria when enabled", () => {
    expect(
      deriveOrganizerPayoutRegion({
        country: "NG",
        paystackOrganizerEnabled: true,
      }),
    ).toEqual({
      country: "NG",
      defaultPayoutCurrency: "NGN",
      recommendedProvider: PaymentProvider.PAYSTACK,
    });
  });

  it("returns null currency for unsupported countries", () => {
    expect(
      deriveOrganizerPayoutRegion({
        country: "XX",
        paystackOrganizerEnabled: false,
      }),
    ).toEqual({
      country: "XX",
      defaultPayoutCurrency: null,
      recommendedProvider: PaymentProvider.STRIPE,
    });
  });
});
