export function formatDateTime(date: string | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getCurrencyLocale(currency: string) {
  return currency.toUpperCase() === "NGN" ? "en-NG" : "en-IE";
}

export function formatMoney(value: string, currency: string) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `${value} ${currency}`;
  }

  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    currency,
    style: "currency",
  }).format(amount / 100);
}
