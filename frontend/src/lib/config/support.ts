import { env } from "@/lib/config/env";

export function getSupportEmail() {
  return env.supportEmail;
}

export function getSupportLabel() {
  return env.supportLabel;
}

export function getSupportMailtoHref(subject?: string) {
  const email = getSupportEmail();

  if (!subject) {
    return `mailto:${email}`;
  }

  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
