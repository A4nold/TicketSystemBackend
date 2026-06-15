export function getCurrencyLocale(currency: string) {
  return currency.toUpperCase() === "NGN" ? "en-NG" : "en-IE";
}

export function formatCurrencyAmount(
  value: number | string,
  currency: string,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    currency,
    style: "currency",
    ...options,
  }).format(Number(value));
}
