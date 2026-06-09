import type { OrganizerProfile } from "@/lib/organizer/organizer-profile-client";
import type { PaystackOrganizerAccountStatus } from "@/lib/payments/paystack-organizer-account-client";
import type { StripeConnectAccountStatus } from "@/lib/payments/stripe-connect-client";

export type OrganizerSetupStep =
  | "intro"
  | "identity"
  | "location"
  | "provider"
  | "payments"
  | "verification"
  | "complete";

export function hasCompletedOrganizerIdentity(profile: OrganizerProfile | null | undefined) {
  return Boolean(profile?.displayName?.trim());
}

export function hasCompletedOrganizerLocation(profile: OrganizerProfile | null | undefined) {
  return Boolean(
    profile?.country?.trim() && profile?.defaultPayoutCurrency?.trim(),
  );
}

export function isOrganizerProfileReadyForPayments(
  profile: OrganizerProfile | null | undefined,
) {
  return hasCompletedOrganizerIdentity(profile) && hasCompletedOrganizerLocation(profile);
}

export function deriveOrganizerSetupStep(input: {
  profile: OrganizerProfile | null | undefined;
  paystackAccount: PaystackOrganizerAccountStatus | null | undefined;
  stripeAccount: StripeConnectAccountStatus | null | undefined;
}) {
  const { profile, paystackAccount, stripeAccount } = input;

  if (!profile || profile.onboardingStatus === "NOT_STARTED") {
    return "intro" satisfies OrganizerSetupStep;
  }

  if (!hasCompletedOrganizerIdentity(profile)) {
    return "identity" satisfies OrganizerSetupStep;
  }

  if (!hasCompletedOrganizerLocation(profile)) {
    return "location" satisfies OrganizerSetupStep;
  }

  if (!profile.selectedPaymentProvider) {
    return "provider" satisfies OrganizerSetupStep;
  }

  if (profile.selectedPaymentProvider === "PAYSTACK") {
    if (!paystackAccount?.detailsSubmitted) {
      return "payments" satisfies OrganizerSetupStep;
    }

    if (!paystackAccount.isReadyForPaidEvents) {
      return "verification" satisfies OrganizerSetupStep;
    }

    return "complete" satisfies OrganizerSetupStep;
  }

  if (!stripeAccount?.connectedAccountId) {
    return "payments" satisfies OrganizerSetupStep;
  }

  if (!stripeAccount.isReadyForPaidEvents) {
    return "verification" satisfies OrganizerSetupStep;
  }

  return "complete" satisfies OrganizerSetupStep;
}
