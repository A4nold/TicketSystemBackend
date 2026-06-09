import { describe, expect, it } from "vitest";

import { deriveOrganizerSetupStep } from "@/features/organizer/organizer-setup-flow";

describe("deriveOrganizerSetupStep", () => {
  it("starts at intro when no organizer profile exists", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: null,
        stripeAccount: null,
      }),
    ).toBe("intro");
  });

  it("moves to location after identity is saved", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: {
          businessName: null,
          country: null,
          createdAt: "",
          defaultPayoutCurrency: null,
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "PROFILE_INCOMPLETE",
          providerSelectedAt: null,
          providerSelectionSource: null,
          recommendedProvider: null,
          selectedPaymentProvider: null,
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: null,
      }),
    ).toBe("location");
  });

  it("moves to provider after profile details are complete but no provider is selected", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: {
          businessName: "Campus Night Limited",
          country: "IE",
          createdAt: "",
          defaultPayoutCurrency: "EUR",
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "PAYMENT_SETUP_PENDING",
          providerSelectedAt: null,
          providerSelectionSource: null,
          recommendedProvider: "STRIPE",
          selectedPaymentProvider: null,
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: {
          chargesEnabled: false,
          connectedAccountId: null,
          country: "IE",
          defaultCurrency: "EUR",
          detailsSubmitted: false,
          disabledReason: null,
          firstReadyAt: null,
          isReadyForPaidEvents: false,
          lastSyncedAt: null,
          onboardingCompletedAt: null,
          onboardingStatus: "NOT_STARTED",
          organizerId: "user_1",
          payoutsEnabled: false,
          readinessCheckedAt: null,
          requirements: {
            currentlyDue: [],
            eventuallyDue: [],
            pastDue: [],
          },
          status: "NOT_STARTED",
          verificationStatus: "UNVERIFIED",
        },
      }),
    ).toBe("provider");
  });

  it("moves to payments after a provider is selected", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: {
          businessName: "Campus Night Limited",
          country: "IE",
          createdAt: "",
          defaultPayoutCurrency: "EUR",
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "PAYMENT_SETUP_PENDING",
          providerSelectedAt: "",
          providerSelectionSource: "MANUAL",
          recommendedProvider: "STRIPE",
          selectedPaymentProvider: "STRIPE",
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: {
          chargesEnabled: false,
          connectedAccountId: null,
          country: "IE",
          defaultCurrency: "EUR",
          detailsSubmitted: false,
          disabledReason: null,
          firstReadyAt: null,
          isReadyForPaidEvents: false,
          lastSyncedAt: null,
          onboardingCompletedAt: null,
          onboardingStatus: "NOT_STARTED",
          organizerId: "user_1",
          payoutsEnabled: false,
          readinessCheckedAt: null,
          requirements: {
            currentlyDue: [],
            eventuallyDue: [],
            pastDue: [],
          },
          status: "NOT_STARTED",
          verificationStatus: "UNVERIFIED",
        },
      }),
    ).toBe("payments");
  });

  it("moves to verification when Stripe exists but is not ready", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: {
          businessName: "Campus Night Limited",
          country: "IE",
          createdAt: "",
          defaultPayoutCurrency: "EUR",
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "PAYMENT_SETUP_PENDING",
          providerSelectedAt: "",
          providerSelectionSource: "MANUAL",
          recommendedProvider: "STRIPE",
          selectedPaymentProvider: "STRIPE",
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: {
          chargesEnabled: false,
          connectedAccountId: "acct_123",
          country: "IE",
          defaultCurrency: "EUR",
          detailsSubmitted: true,
          disabledReason: null,
          firstReadyAt: null,
          isReadyForPaidEvents: false,
          lastSyncedAt: null,
          onboardingCompletedAt: null,
          onboardingStatus: "IN_PROGRESS",
          organizerId: "user_1",
          payoutsEnabled: false,
          readinessCheckedAt: null,
          requirements: {
            currentlyDue: ["verification.document"],
            eventuallyDue: [],
            pastDue: [],
          },
          status: "PENDING",
          verificationStatus: "PENDING",
        },
      }),
    ).toBe("verification");
  });

  it("completes once Stripe is ready for paid events", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: null,
        profile: {
          businessName: "Campus Night Limited",
          country: "IE",
          createdAt: "",
          defaultPayoutCurrency: "EUR",
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "READY_FOR_PAID_EVENTS",
          providerSelectedAt: "",
          providerSelectionSource: "MANUAL",
          recommendedProvider: "STRIPE",
          selectedPaymentProvider: "STRIPE",
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: {
          chargesEnabled: true,
          connectedAccountId: "acct_123",
          country: "IE",
          defaultCurrency: "EUR",
          detailsSubmitted: true,
          disabledReason: null,
          firstReadyAt: null,
          isReadyForPaidEvents: true,
          lastSyncedAt: null,
          onboardingCompletedAt: null,
          onboardingStatus: "COMPLETED",
          organizerId: "user_1",
          payoutsEnabled: true,
          readinessCheckedAt: null,
          requirements: {
            currentlyDue: [],
            eventuallyDue: [],
            pastDue: [],
          },
          status: "VERIFIED",
          verificationStatus: "VERIFIED",
        },
      }),
    ).toBe("complete");
  });

  it("moves Paystack organizers to verification once payout details are saved", () => {
    expect(
      deriveOrganizerSetupStep({
        paystackAccount: {
          accountHolderName: "Campus Night Limited",
          bankCode: "058",
          businessName: "Campus Night Limited",
          chargesEnabled: false,
          country: "NG",
          defaultCurrency: "NGN",
          detailsSubmitted: true,
          disabledReason: null,
          firstReadyAt: null,
          isActive: false,
          isReadyForPaidEvents: false,
          isVerified: false,
          lastSyncedAt: null,
          maskedAccountNumber: "****6789",
          onboardingCompletedAt: null,
          onboardingStatus: "IN_PROGRESS",
          organizerId: "user_1",
          payoutsEnabled: false,
          readinessCheckedAt: null,
          requirementsSummary: "Paystack payout details saved.",
          settlementSchedule: null,
          status: "PENDING",
          subaccountCode: null,
          verificationStatus: "PENDING",
        },
        profile: {
          businessName: "Campus Night Limited",
          country: "NG",
          createdAt: "",
          defaultPayoutCurrency: "NGN",
          displayName: "Campus Night",
          id: "org_profile_1",
          onboardingStatus: "PAYMENT_SETUP_PENDING",
          providerSelectedAt: "",
          providerSelectionSource: "MANUAL",
          recommendedProvider: "PAYSTACK",
          selectedPaymentProvider: "PAYSTACK",
          updatedAt: "",
          userId: "user_1",
        },
        stripeAccount: null,
      }),
    ).toBe("verification");
  });
});
