const fallbackSupportEmail = "support@ticketsystem.local";
const fallbackSupportLabel = "support@ticketsystem.local";

export function getSupportEmail() {
  return process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || fallbackSupportEmail;
}

export function getSupportLabel() {
  return process.env.EXPO_PUBLIC_SUPPORT_LABEL?.trim() || getSupportEmail() || fallbackSupportLabel;
}

export function getSupportMailtoHref(subject?: string) {
  const email = getSupportEmail();

  if (!subject) {
    return `mailto:${email}`;
  }

  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
