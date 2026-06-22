function titleCaseStatus(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getCheckoutReturnPaymentStatusLabel(value?: string | null) {
  if (!value) {
    return "Paid";
  }

  return titleCaseStatus(value);
}

export function getCheckoutReturnCheckoutStatusLabel(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return titleCaseStatus(value);
}
