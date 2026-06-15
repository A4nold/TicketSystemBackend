const TIMEZONE_ALIASES: Record<string, string> = {
  "africa/nigeria": "Africa/Lagos",
};

function resolveTimezoneAlias(timezone: string) {
  return TIMEZONE_ALIASES[timezone.trim().toLowerCase()] ?? timezone.trim();
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-IE", { timeZone: resolveTimezoneAlias(timezone) });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone: string) {
  return resolveTimezoneAlias(timezone);
}

export function coerceTimezone(timezone: string, fallback = "UTC") {
  const normalized = normalizeTimezone(timezone);
  return isValidTimezone(normalized) ? normalized : fallback;
}
