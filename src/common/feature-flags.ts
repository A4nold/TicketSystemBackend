function parseBooleanFlag(value: string | undefined, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export function isOfferRangePricingEnabled() {
  return parseBooleanFlag(process.env.ENABLE_OFFER_RANGE_PRICING, false);
}

export function isStripeConnectOnboardingEnabled() {
  return parseBooleanFlag(process.env.ENABLE_STRIPE_CONNECT_ONBOARDING, false);
}

export function isStripeConnectEventPublishGuardEnabled() {
  return parseBooleanFlag(process.env.ENABLE_STRIPE_CONNECT_EVENT_PUBLISH_GUARD, false);
}

export function isStripeConnectCheckoutEnabled() {
  return parseBooleanFlag(process.env.ENABLE_STRIPE_CONNECT_CHECKOUT, false);
}
