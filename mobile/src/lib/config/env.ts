const fallbackApiBaseUrl = "http://localhost:3000";

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!configured) {
    return fallbackApiBaseUrl;
  }

  return configured.replace(/\/$/, "");
}
