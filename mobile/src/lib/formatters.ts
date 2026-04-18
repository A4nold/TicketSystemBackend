export function formatDateTime(date: string | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatMoney(value: string, currency: string) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `${value} ${currency}`;
  }

  return new Intl.NumberFormat("en-IE", {
    currency,
    style: "currency",
  }).format(amount / 100);
}
