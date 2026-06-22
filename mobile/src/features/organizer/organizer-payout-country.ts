export type OrganizerPayoutCountryOption = {
  code: string;
  currency: string;
  label: string;
};

export const ORGANIZER_PAYOUT_COUNTRY_OPTIONS: OrganizerPayoutCountryOption[] = [
  { code: "IE", currency: "EUR", label: "Ireland" },
  { code: "NG", currency: "NGN", label: "Nigeria" },
  { code: "GB", currency: "GBP", label: "United Kingdom" },
  { code: "US", currency: "USD", label: "United States" },
  { code: "CA", currency: "CAD", label: "Canada" },
  { code: "ZA", currency: "ZAR", label: "South Africa" },
  { code: "KE", currency: "KES", label: "Kenya" },
  { code: "GH", currency: "GHS", label: "Ghana" },
  { code: "AE", currency: "AED", label: "United Arab Emirates" },
  { code: "DE", currency: "EUR", label: "Germany" },
  { code: "FR", currency: "EUR", label: "France" },
  { code: "NL", currency: "EUR", label: "Netherlands" },
];

export function getOrganizerPayoutCountryOption(country: string | null | undefined) {
  const normalizedCountry = country?.trim().toUpperCase() ?? "";
  return ORGANIZER_PAYOUT_COUNTRY_OPTIONS.find((option) => option.code === normalizedCountry) ?? null;
}

export function derivePayoutCurrencyFromCountry(country: string | null | undefined) {
  return getOrganizerPayoutCountryOption(country)?.currency ?? "";
}
