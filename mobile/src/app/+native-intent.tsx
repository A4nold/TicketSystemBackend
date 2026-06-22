type RedirectInput = {
  initial: boolean;
  path: string;
};

const KNOWN_PREFIXES = [
  "/",
  "/checkout/",
  "/events/",
  "/tickets/",
  "/transfer/",
  "/staff/",
  "/organizer",
  "/privacy-policy",
  "/(auth)/",
  "/(public)/",
  "/(tabs)/",
  "/(onboarding)/",
  "/onboarding",
];

function buildDebugHomeTarget(rawPath: string, target: string) {
  const debug = encodeURIComponent(rawPath || "");
  const resolved = encodeURIComponent(target);
  return `/?dl_debug=${debug}&dl_target=${resolved}`;
}

export function redirectSystemPath({ path }: RedirectInput) {
  const normalized = (path || "").trim();
  let pathnamePart = normalized;
  let queryPart = "";

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      pathnamePart = `${parsed.host ? `/${parsed.host}` : ""}${parsed.pathname}`;
      queryPart = parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search;
    } catch {
      // Keep the original value fallback if URL parsing fails.
      const split = normalized.split("?");
      pathnamePart = split[0] ?? normalized;
      queryPart = split[1] ?? "";
    }
  } else {
    const split = normalized.split("?");
    pathnamePart = split[0] ?? normalized;
    queryPart = split[1] ?? "";
  }

  const cleanedPathname = pathnamePart.replace(/\/{2,}/g, "/");

  // Some providers can bounce back with only `ticketsystem:///` (empty path).
  // Route those safely to the app root instead of not-found.
  if (
    !cleanedPathname ||
    cleanedPathname === "/" ||
    cleanedPathname === "///"
  ) {
    // If payment return params exist on a root deep link, route to checkout success.
    if (
      queryPart.includes("orderId=") ||
      queryPart.includes("payment_intent=") ||
      queryPart.includes("session_id=") ||
      queryPart.includes("reference=") ||
      queryPart.includes("trxref=")
    ) {
      const target = `/checkout/success?${queryPart}`;
      if (__DEV__) {
        console.info("[native-intent] root-with-payment-query", {
          cleanedPathname,
          normalized,
          queryPart,
          target,
        });
      }
      return target;
    }

    const debugHomeTarget = buildDebugHomeTarget(normalized, "/");
    if (__DEV__) {
      console.info("[native-intent] root-fallback-home", {
        cleanedPathname,
        normalized,
        queryPart,
        target: debugHomeTarget,
      });
    }
    return debugHomeTarget;
  }

  const normalizedPath = cleanedPathname.startsWith("/") ? cleanedPathname : `/${cleanedPathname}`;
  const isKnownRoute = KNOWN_PREFIXES.some((prefix) =>
    normalizedPath === prefix || normalizedPath.startsWith(prefix),
  );

  if (!isKnownRoute) {
    const debugHomeTarget = buildDebugHomeTarget(normalized, "/");
    if (__DEV__) {
      console.info("[native-intent] unknown-route-fallback-home", {
        cleanedPathname,
        normalized,
        normalizedPath,
        queryPart,
        target: debugHomeTarget,
      });
    }
    return debugHomeTarget;
  }

  const finalTarget = queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
  if (__DEV__) {
    console.info("[native-intent] known-route", {
      cleanedPathname,
      normalized,
      normalizedPath,
      queryPart,
      target: finalTarget,
    });
  }
  return finalTarget;
}
