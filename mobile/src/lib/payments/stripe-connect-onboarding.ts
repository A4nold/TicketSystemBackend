import * as WebBrowser from "expo-web-browser";

import { getApiBaseUrl } from "@/lib/config/env";

WebBrowser.maybeCompleteAuthSession();

export function buildStripeConnectRedirectUrls(pathname = "/organizer/setup") {
  const normalizedPath = pathname.replace(/^\//, "");
  const appReturnUrl = `ticketsystem:///${normalizedPath}?stripe_return=1`;
  const appRefreshUrl = `ticketsystem:///${normalizedPath}?stripe_refresh=1`;
  const apiBaseUrl = getApiBaseUrl();
  const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

  const returnBridgeUrl = new URL("/api/payments/stripe/return", backendBaseUrl);
  returnBridgeUrl.searchParams.set("scheme", "ticketsystem");
  returnBridgeUrl.searchParams.set("path", pathname);
  returnBridgeUrl.searchParams.set("stripe_return", "1");

  const refreshBridgeUrl = new URL("/api/payments/stripe/return", backendBaseUrl);
  refreshBridgeUrl.searchParams.set("scheme", "ticketsystem");
  refreshBridgeUrl.searchParams.set("path", pathname);
  refreshBridgeUrl.searchParams.set("stripe_refresh", "1");

  return {
    appRefreshUrl,
    appReturnUrl,
    refreshUrl: refreshBridgeUrl.toString(),
    returnUrl: returnBridgeUrl.toString(),
  };
}

export async function openStripeConnectOnboardingSession(
  onboardingUrl: string,
  appReturnUrl: string,
) {
  return WebBrowser.openAuthSessionAsync(onboardingUrl, appReturnUrl);
}
