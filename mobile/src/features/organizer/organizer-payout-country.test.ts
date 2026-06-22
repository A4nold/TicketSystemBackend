import { describe, expect, it } from "vitest";

import {
  derivePayoutCurrencyFromCountry,
  getOrganizerPayoutCountryOption,
  ORGANIZER_PAYOUT_COUNTRY_OPTIONS,
} from "./organizer-payout-country";

describe("organizer payout country helpers", () => {
  it("includes Ireland and Nigeria in the selectable list", () => {
    expect(ORGANIZER_PAYOUT_COUNTRY_OPTIONS.some((option) => option.code === "IE")).toBe(true);
    expect(ORGANIZER_PAYOUT_COUNTRY_OPTIONS.some((option) => option.code === "NG")).toBe(true);
  });

  it("maps a selected country code to its payout currency", () => {
    expect(derivePayoutCurrencyFromCountry("NG")).toBe("NGN");
    expect(derivePayoutCurrencyFromCountry("gb")).toBe("GBP");
  });

  it("returns the full option for a saved country code", () => {
    expect(getOrganizerPayoutCountryOption("IE")).toEqual({
      code: "IE",
      currency: "EUR",
      label: "Ireland",
    });
  });

  it("returns null for unsupported country codes", () => {
    expect(getOrganizerPayoutCountryOption("XX")).toBeNull();
    expect(derivePayoutCurrencyFromCountry("XX")).toBe("");
  });
});
