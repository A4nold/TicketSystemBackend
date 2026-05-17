function parseBooleanFlag(value: string | undefined) {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export function isProductionLikeEnv() {
  return process.env.NODE_ENV === "production";
}

export function isSecurityRelaxedLocalEnabled() {
  return parseBooleanFlag(process.env.SECURITY_RELAXED_LOCAL);
}

export function resolveRequiredSecret(
  variableName: string,
  fallbackForLocalDev?: string,
) {
  const raw = process.env[variableName]?.trim();

  if (raw) {
    return raw;
  }

  if (!isProductionLikeEnv() && isSecurityRelaxedLocalEnabled() && fallbackForLocalDev) {
    return fallbackForLocalDev;
  }

  throw new Error(`${variableName} must be defined before starting the API.`);
}

export function assertSecurityModeConsistency() {
  if (isProductionLikeEnv() && isSecurityRelaxedLocalEnabled()) {
    throw new Error("SECURITY_RELAXED_LOCAL must never be enabled in production.");
  }
}
