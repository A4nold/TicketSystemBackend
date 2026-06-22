import { PaymentProvider } from "@prisma/client";

export type OrganizerPayoutRegion = {
  country: string | null;
  defaultPayoutCurrency: string | null;
  recommendedProvider: PaymentProvider | null;
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  AE: "AED",
  CA: "CAD",
  DE: "EUR",
  FR: "EUR",
  GB: "GBP",
  GH: "GHS",
  IE: "EUR",
  KE: "KES",
  NG: "NGN",
  NL: "EUR",
  US: "USD",
  ZA: "ZAR",
};

export function normalizeOrganizerCountry(country: string | null | undefined) {
  const normalized = country?.trim().toUpperCase() ?? "";
  return normalized.length === 2 ? normalized : null;
}

export function deriveOrganizerPayoutRegion(input: {
  country: string | null | undefined;
  paystackOrganizerEnabled: boolean;
}) {
  const country = normalizeOrganizerCountry(input.country);
  const defaultPayoutCurrency = country ? COUNTRY_CURRENCY_MAP[country] ?? null : null;

  if (!country) {
    return {
      country: null,
      defaultPayoutCurrency: null,
      recommendedProvider: null,
    } satisfies OrganizerPayoutRegion;
  }

  if (
    input.paystackOrganizerEnabled &&
    country === "NG" &&
    defaultPayoutCurrency === "NGN"
  ) {
    return {
      country,
      defaultPayoutCurrency,
      recommendedProvider: PaymentProvider.PAYSTACK,
    } satisfies OrganizerPayoutRegion;
  }

  return {
    country,
    defaultPayoutCurrency,
    recommendedProvider: PaymentProvider.STRIPE,
  } satisfies OrganizerPayoutRegion;
}
