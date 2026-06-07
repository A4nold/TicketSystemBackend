import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import {
  deriveOrganizerSetupStep,
  hasCompletedOrganizerIdentity,
  hasCompletedOrganizerLocation,
  type OrganizerSetupStep,
} from "@/features/organizer/organizer-setup-flow";
import {
  getOrganizerProfile,
  upsertOrganizerProfile,
  type OrganizerProfile,
} from "@/lib/organizer/organizer-profile-client";
import {
  getPaymentProviderCapabilityMatrix,
  getPaymentProviderAvailability,
  selectPaymentProvider,
  type PaymentProviderCode,
} from "@/lib/payments/payment-provider-client";
import {
  createStripeConnectOnboardingLink,
  getStripeConnectAccountStatus,
  refreshStripeConnectOnboardingLink,
} from "@/lib/payments/stripe-connect-client";
import {
  buildStripeConnectRedirectUrls,
  openStripeConnectOnboardingSession,
} from "@/lib/payments/stripe-connect-onboarding";
import { palette } from "@/styles/theme";

function getStripeActionLabel(input: {
  connectedAccountId: string | null;
  isReadyForPaidEvents: boolean;
  onboardingStatus: string | null;
  requirements: {
    currentlyDue: string[];
    pastDue: string[];
  };
}) {
  if (!input.connectedAccountId) {
    return "Connect Stripe";
  }

  if (input.isReadyForPaidEvents) {
    return "Refresh Stripe status";
  }

  if (input.requirements.pastDue.length > 0 || input.onboardingStatus === "RESTRICTED") {
    return "Resolve Stripe requirements";
  }

  return "Resume Stripe onboarding";
}

function StepPill({
  active,
  disabled = false,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.stepPill,
        active ? styles.stepPillActive : null,
        disabled ? styles.stepPillDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.stepPillText,
          active ? styles.stepPillTextActive : null,
          disabled ? styles.stepPillTextDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatRequirementList(items: string[]) {
  return items.map((item) => `• ${item}`).join("\n");
}

function formatStripeAccountId(accountId: string | null) {
  if (!accountId) {
    return "Not connected";
  }

  if (accountId.length <= 12) {
    return accountId;
  }

  return `${accountId.slice(0, 8)}…${accountId.slice(-4)}`;
}

function getReachableSetupSteps(input: {
  profile:
    | Pick<
        OrganizerProfile,
        "country" | "defaultPayoutCurrency" | "displayName" | "selectedPaymentProvider"
      >
    | null
    | undefined;
  stripeAccount:
    | {
        connectedAccountId: string | null;
        isReadyForPaidEvents: boolean;
      }
    | null
    | undefined;
}) {
  const reachable = new Set<OrganizerSetupStep>(["intro", "identity"]);
  const hasIdentity = Boolean(input.profile?.displayName?.trim());
  const hasLocation = Boolean(
    input.profile?.country?.trim() && input.profile?.defaultPayoutCurrency?.trim(),
  );

  if (hasIdentity) {
    reachable.add("location");
  }

  if (hasLocation) {
    reachable.add("provider");
  }

  if (input.profile?.selectedPaymentProvider) {
    reachable.add("payments");
  }

  if (input.stripeAccount?.connectedAccountId) {
    reachable.add("verification");
  }

  if (input.stripeAccount?.isReadyForPaidEvents) {
    reachable.add("complete");
  }

  return reachable;
}

export function OrganizerSetupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<OrganizerSetupStep | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [defaultPayoutCurrency, setDefaultPayoutCurrency] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);
  const [isRefreshingAfterReturn, setIsRefreshingAfterReturn] = useState(false);
  const [pendingStripeReturnRefresh, setPendingStripeReturnRefresh] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);

  const organizerProfileQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => getOrganizerProfile(session!.accessToken),
    queryKey: ["organizer-profile", session?.accessToken],
  });

  const stripeAccountQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => getStripeConnectAccountStatus(session!.accessToken),
    queryKey: ["organizer-stripe-account", session?.accessToken],
  });
  const providerAvailabilityQuery = useQuery({
    enabled: Boolean(
      session?.accessToken &&
        hasCompletedOrganizerIdentity(organizerProfileQuery.data) &&
        hasCompletedOrganizerLocation(organizerProfileQuery.data),
    ),
    queryFn: () => getPaymentProviderAvailability(session!.accessToken),
    queryKey: ["organizer-payment-providers", session?.accessToken],
  });
  const providerCapabilityMatrixQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => getPaymentProviderCapabilityMatrix(session!.accessToken),
    queryKey: ["organizer-payment-provider-capabilities", session?.accessToken],
  });

  const derivedStep = useMemo(
    () =>
      deriveOrganizerSetupStep({
        profile: organizerProfileQuery.data,
        stripeAccount: stripeAccountQuery.data,
      }),
    [organizerProfileQuery.data, stripeAccountQuery.data],
  );
  const reachableSteps = useMemo(
    () =>
      getReachableSetupSteps({
        profile: organizerProfileQuery.data,
        stripeAccount: stripeAccountQuery.data,
      }),
    [organizerProfileQuery.data, stripeAccountQuery.data],
  );

  useEffect(() => {
    if (!organizerProfileQuery.data) {
      return;
    }

    setDisplayName(organizerProfileQuery.data.displayName ?? "");
    setBusinessName(organizerProfileQuery.data.businessName ?? "");
    setCountry(organizerProfileQuery.data.country ?? "");
    setDefaultPayoutCurrency(organizerProfileQuery.data.defaultPayoutCurrency ?? "");
  }, [organizerProfileQuery.data]);

  useEffect(() => {
    setCurrentStep((existing) => {
      if (!existing) {
        return derivedStep;
      }

      if (derivedStep === "complete") {
        return "complete";
      }

      return existing;
    });
  }, [derivedStep]);

  const refreshAfterStripeReturn = useCallback(
    async (message?: string) => {
      setIsRefreshingAfterReturn(true);

      try {
        await refreshSetupQueries();
        setCurrentStep(null);
        setPendingStripeReturnRefresh(false);
        setScreenError(null);
        if (message) {
          setScreenMessage(message);
        }
      } finally {
        setIsRefreshingAfterReturn(false);
      }
    },
    [organizerProfileQuery, queryClient, session?.accessToken, stripeAccountQuery],
  );

  useFocusEffect(
    useCallback(() => {
      if (!pendingStripeReturnRefresh || isOpeningStripe) {
        return undefined;
      }

      void refreshAfterStripeReturn("Back from Stripe. Rechecking verification status.");
      return undefined;
    }, [isOpeningStripe, pendingStripeReturnRefresh, refreshAfterStripeReturn]),
  );

  async function refreshSetupQueries() {
    await Promise.all([
      organizerProfileQuery.refetch(),
      stripeAccountQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["organizer-profile", session?.accessToken] }),
      queryClient.invalidateQueries({
        queryKey: ["organizer-payment-providers", session?.accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["organizer-payment-provider-capabilities", session?.accessToken],
      }),
      queryClient.invalidateQueries({ queryKey: ["organizer-stripe-account", session?.accessToken] }),
      queryClient.invalidateQueries({ queryKey: ["organizer-payout-visibility", session?.accessToken] }),
    ]);
  }

  async function handleIdentitySubmit() {
    if (!session?.accessToken) {
      return;
    }

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setScreenError("Add a public organizer name before continuing.");
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsSavingProfile(true);

    try {
      await upsertOrganizerProfile(session.accessToken, {
        businessName: businessName.trim() || undefined,
        displayName: trimmedDisplayName,
      });
      await refreshSetupQueries();
      setCurrentStep("location");
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : "Organizer identity couldn't be saved.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleLocationSubmit() {
    if (!session?.accessToken) {
      return;
    }

    const normalizedCountry = country.trim().toUpperCase();
    const normalizedCurrency = defaultPayoutCurrency.trim().toUpperCase();

    if (normalizedCountry.length !== 2) {
      setScreenError("Use a two-letter country code like IE or NG.");
      return;
    }

    if (normalizedCurrency.length !== 3) {
      setScreenError("Use a three-letter currency like EUR or NGN.");
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsSavingProfile(true);

    try {
      await upsertOrganizerProfile(session.accessToken, {
        country: normalizedCountry,
        defaultPayoutCurrency: normalizedCurrency,
      });
      await refreshSetupQueries();
      setCurrentStep("provider");
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : "Organizer location couldn't be saved.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleStripeAction() {
    if (!session?.accessToken || !stripeAccountQuery.data) {
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsOpeningStripe(true);
    setPendingStripeReturnRefresh(true);

    try {
      const redirectUrls = buildStripeConnectRedirectUrls("/organizer/setup");
      const stripeLinkPayload = {
        refreshUrl: redirectUrls.refreshUrl,
        returnUrl: redirectUrls.returnUrl,
      };
      const response =
        stripeAccountQuery.data.connectedAccountId && !stripeAccountQuery.data.isReadyForPaidEvents
          ? await refreshStripeConnectOnboardingLink(session.accessToken, stripeLinkPayload)
          : stripeAccountQuery.data.connectedAccountId
            ? null
            : await createStripeConnectOnboardingLink(session.accessToken, stripeLinkPayload);

      if (response?.onboardingUrl) {
        await openStripeConnectOnboardingSession(
          response.onboardingUrl,
          redirectUrls.appReturnUrl,
        );
        await refreshAfterStripeReturn("Returned from Stripe. Refreshing verification state.");
      } else {
        await refreshAfterStripeReturn("Stripe account status refreshed.");
      }
    } catch (error) {
      setPendingStripeReturnRefresh(false);
      setScreenError(
        error instanceof Error ? error.message : "Stripe onboarding couldn't be opened right now.",
      );
    } finally {
      setIsOpeningStripe(false);
    }
  }

  async function handleProviderSelection(provider: PaymentProviderCode) {
    if (!session?.accessToken) {
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsSavingProvider(true);

    try {
      await selectPaymentProvider(session.accessToken, provider);
      await refreshSetupQueries();
      setCurrentStep("payments");
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : "Payment provider selection couldn't be saved.",
      );
    } finally {
      setIsSavingProvider(false);
    }
  }

  const step = currentStep ?? derivedStep;

  return (
    <Screen
      title="Organizer setup"
      subtitle="Set up your organizer profile and payout path."
      compactHeader
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
      >
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Setup checklist</Text>
            <Text style={styles.heroTitle}>Let’s get you ready to host paid events.</Text>
            <Text style={styles.heroCopy}>
              We’ll sort your public organizer profile first, then connect payouts.
            </Text>

            <View style={styles.stepRow}>
              <StepPill active={step === "intro"} label="Intro" onPress={() => setCurrentStep("intro")} />
              <StepPill
                active={step === "identity"}
                label="Identity"
                onPress={() => setCurrentStep("identity")}
              />
              <StepPill
                active={step === "location"}
                disabled={!reachableSteps.has("location")}
                label="Location"
                onPress={() => setCurrentStep("location")}
              />
              <StepPill
                active={step === "provider"}
                disabled={!reachableSteps.has("provider")}
                label="Provider"
                onPress={() => setCurrentStep("provider")}
              />
              <StepPill
                active={step === "payments"}
                disabled={!reachableSteps.has("payments")}
                label="Payments"
                onPress={() => setCurrentStep("payments")}
              />
              <StepPill
                active={step === "verification"}
                disabled={!reachableSteps.has("verification")}
                label="Verify"
                onPress={() => setCurrentStep("verification")}
              />
              <StepPill
                active={step === "complete"}
                disabled={!reachableSteps.has("complete")}
                label="Done"
                onPress={() => setCurrentStep("complete")}
              />
            </View>
            <Text style={styles.stepHint}>Tap any unlocked step to jump back and review it.</Text>
          </View>
        </Card>

        {screenError ? (
          <Card tone="warning">
            <Text style={styles.errorText}>{screenError}</Text>
          </Card>
        ) : null}

        {screenMessage ? (
          <Card tone="success">
            <Text style={styles.successText}>{screenMessage}</Text>
          </Card>
        ) : null}

        {organizerProfileQuery.isLoading || stripeAccountQuery.isLoading ? (
          <Card>
            <Text style={styles.sectionTitle}>Loading organizer setup</Text>
            <Text style={styles.copy}>Checking your saved profile and payout readiness.</Text>
          </Card>
        ) : null}

        {isRefreshingAfterReturn ? (
          <Card>
            <Text style={styles.sectionTitle}>Refreshing Stripe status</Text>
            <Text style={styles.copy}>
              Pulling the latest verification state from Maya so this checklist stays current.
            </Text>
          </Card>
        ) : null}

        {!organizerProfileQuery.isLoading && !stripeAccountQuery.isLoading && step === "intro" ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Welcome to organizer setup</Text>
              <Text style={styles.copy}>
                Before you publish paid events, we need a few business details and your payout
                connection. Free-event browsing and attendee tools stay available throughout.
              </Text>
              <ActionButton
                onPress={() => {
                  setCurrentStep(
                    hasCompletedOrganizerIdentity(organizerProfileQuery.data)
                      ? hasCompletedOrganizerLocation(organizerProfileQuery.data)
                        ? organizerProfileQuery.data?.selectedPaymentProvider
                          ? "payments"
                          : "provider"
                        : "location"
                      : "identity",
                  );
                }}
                title="Start organizer setup"
              />
            </View>
          </Card>
        ) : null}

        {!organizerProfileQuery.isLoading && step === "identity" ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer identity</Text>
              <Text style={styles.copy}>
                Add the public name attendees will recognize. Business name can be your legal or
                trading name.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setDisplayName}
                  placeholder="Campus Night"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={displayName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Business name</Text>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setBusinessName}
                  placeholder="Campus Night Limited"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={businessName}
                />
              </View>

              <ActionButton
                loading={isSavingProfile}
                onPress={() => void handleIdentitySubmit()}
                title="Save and continue"
              />
            </View>
          </Card>
        ) : null}

        {!organizerProfileQuery.isLoading && step === "location" ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Where you operate</Text>
              <Text style={styles.copy}>
                This helps Maya prepare the right payout setup for your organizer account.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Country code</Text>
                <TextInput
                  autoCapitalize="characters"
                  maxLength={2}
                  onChangeText={setCountry}
                  placeholder="IE"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={country}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Default payout currency</Text>
                <TextInput
                  autoCapitalize="characters"
                  maxLength={3}
                  onChangeText={setDefaultPayoutCurrency}
                  placeholder="EUR"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={defaultPayoutCurrency}
                />
              </View>

              <ActionButton
                loading={isSavingProfile}
                onPress={() => void handleLocationSubmit()}
                title="Save payout region"
              />
            </View>
          </Card>
        ) : null}

        {providerAvailabilityQuery.isLoading && step === "provider" ? (
          <Card>
            <Text style={styles.sectionTitle}>Checking provider options</Text>
            <Text style={styles.copy}>
              Matching payout providers to your organizer country and currency.
            </Text>
          </Card>
        ) : null}

        {!providerAvailabilityQuery.isLoading && step === "provider" && providerAvailabilityQuery.data ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Choose your payout provider</Text>
              <Text style={styles.copy}>
                Maya recommends a provider based on your organizer country, payout currency, and
                current rollout support.
              </Text>

              {providerAvailabilityQuery.data.providers.map((provider) => {
                const isSelected =
                  organizerProfileQuery.data?.selectedPaymentProvider === provider.provider;
                const capabilitySummary = [
                  provider.supportsCustomerCheckout ? "checkout" : null,
                  provider.supportsOnboarding ? "onboarding" : null,
                  provider.supportsPayouts ? "payouts" : null,
                  provider.supportsRefunds ? "refunds" : null,
                  provider.supportsDisputes ? "disputes" : null,
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <View
                    key={provider.provider}
                    style={[
                      styles.providerCard,
                      provider.recommended ? styles.providerCardRecommended : null,
                    ]}
                  >
                    <View style={styles.providerHeader}>
                      <Text style={styles.providerTitle}>{provider.provider}</Text>
                      <View
                        style={[
                          styles.providerStatusPill,
                          provider.status === "AVAILABLE"
                            ? styles.providerStatusAvailable
                            : provider.status === "COMING_SOON"
                              ? styles.providerStatusSoon
                              : styles.providerStatusUnavailable,
                        ]}
                      >
                        <Text style={styles.providerStatusText}>
                          {provider.recommended ? "Recommended" : provider.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.value}>{provider.summary}</Text>
                    {provider.detail ? <Text style={styles.copy}>{provider.detail}</Text> : null}
                    <Text style={styles.providerMeta}>
                      Rollout: {provider.rolloutStage} • Supports: {capabilitySummary || "limited"}
                    </Text>
                    <Text style={styles.providerMeta}>
                      Model: {provider.operatingModel}
                    </Text>
                    <ActionButton
                      disabled={provider.status !== "AVAILABLE"}
                      loading={isSavingProvider}
                      onPress={() => {
                        void handleProviderSelection(provider.provider);
                      }}
                      title={
                        isSelected
                          ? "Selected"
                          : provider.status === "AVAILABLE"
                            ? `Use ${provider.provider}`
                            : provider.status === "COMING_SOON"
                              ? "Coming soon"
                              : "Unavailable"
                      }
                      variant={isSelected ? "secondary" : "primary"}
                    />
                  </View>
                );
              })}

              {providerCapabilityMatrixQuery.data ? (
                <View style={styles.providerMatrixShell}>
                  <Text style={styles.sectionTitle}>Provider capability matrix</Text>
                  <Text style={styles.copy}>
                    This is Maya’s current rollout position for organizer payouts and operations.
                  </Text>
                  {providerCapabilityMatrixQuery.data.providers.map((provider) => (
                    <View key={`matrix-${provider.provider}`} style={styles.providerMatrixCard}>
                      <Text style={styles.providerTitle}>{provider.provider}</Text>
                      <Text style={styles.providerMeta}>Stage: {provider.rolloutStage}</Text>
                      <Text style={styles.providerMeta}>
                        Checkout: {provider.supportsCustomerCheckout ? "Yes" : "No"} • Onboarding:{" "}
                        {provider.supportsOnboarding ? "Yes" : "No"} • Payouts:{" "}
                        {provider.supportsPayouts ? "Yes" : "No"}
                      </Text>
                      <Text style={styles.providerMeta}>
                        Fees: {provider.supportsPlatformFeeAutomation ? "Automated" : "Limited"} •
                        Refunds: {provider.supportsRefunds ? "Supported" : "Not yet"} • Disputes:{" "}
                        {provider.supportsDisputes ? "Supported" : "Not yet"}
                      </Text>
                      <Text style={styles.copy}>{provider.operatingModel}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {!stripeAccountQuery.isLoading && step === "payments" && stripeAccountQuery.data ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Connect payouts</Text>
              <Text style={styles.copy}>
                {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE"
                  ? "Stripe Connect handles organizer payouts for this setup path. We’ll send you to Stripe and bring you back here when you’re done."
                  : "Your selected provider will appear here once its organizer onboarding path is active for this rollout."}
              </Text>

              {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE" ? (
                <>
                  <Text style={styles.value}>
                    {stripeAccountQuery.data.connectedAccountId
                      ? "Stripe account found."
                      : "No Stripe account connected yet."}
                  </Text>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Account</Text>
                      <Text style={styles.metricValueSmall}>
                        {formatStripeAccountId(stripeAccountQuery.data.connectedAccountId)}
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Verification</Text>
                      <Text style={styles.metricValueSmall}>
                        {stripeAccountQuery.data.verificationStatus ?? "Unknown"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.copy}>
                    Status: {stripeAccountQuery.data.status ?? "Unknown"}
                    {stripeAccountQuery.data.lastSyncedAt
                      ? ` • Last synced ${new Date(stripeAccountQuery.data.lastSyncedAt).toLocaleString()}`
                      : ""}
                  </Text>

                  <ActionButton
                    loading={isOpeningStripe}
                    onPress={() => void handleStripeAction()}
                    title={getStripeActionLabel(stripeAccountQuery.data)}
                  />
                  {stripeAccountQuery.data.connectedAccountId &&
                  !stripeAccountQuery.data.isReadyForPaidEvents ? (
                    <ActionButton
                      onPress={() => {
                        setCurrentStep("verification");
                      }}
                      title="Review verification checklist"
                      variant="secondary"
                    />
                  ) : null}
                </>
              ) : (
                <ActionButton
                  onPress={() => {
                    setCurrentStep("provider");
                  }}
                  title="Review provider selection"
                  variant="secondary"
                />
              )}
            </View>
          </Card>
        ) : null}

        {!stripeAccountQuery.isLoading && step === "verification" && stripeAccountQuery.data ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Verification</Text>
              <Text style={styles.copy}>
                We’re checking whether Stripe has everything needed for paid event publishing and
                payouts.
              </Text>
              <Text style={styles.value}>
                {stripeAccountQuery.data.isReadyForPaidEvents
                  ? "Stripe is ready for paid events."
                  : "Stripe still needs attention before paid events can go live."}
              </Text>

              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Charges</Text>
                  <Text style={styles.metricValueSmall}>
                    {stripeAccountQuery.data.chargesEnabled ? "Enabled" : "Pending"}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Payouts</Text>
                  <Text style={styles.metricValueSmall}>
                    {stripeAccountQuery.data.payoutsEnabled ? "Enabled" : "Pending"}
                  </Text>
                </View>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Details submitted</Text>
                  <Text style={styles.metricValueSmall}>
                    {stripeAccountQuery.data.detailsSubmitted ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Onboarding</Text>
                  <Text style={styles.metricValueSmall}>
                    {stripeAccountQuery.data.onboardingStatus ?? "Unknown"}
                  </Text>
                </View>
              </View>

              {stripeAccountQuery.data.requirements.currentlyDue.length > 0 ? (
                <Text style={styles.requirementList}>
                  Current requirements{"\n"}
                  {formatRequirementList(stripeAccountQuery.data.requirements.currentlyDue)}
                </Text>
              ) : null}

              {stripeAccountQuery.data.requirements.pastDue.length > 0 ? (
                <Text style={styles.errorText}>
                  Past due requirements{"\n"}
                  {formatRequirementList(stripeAccountQuery.data.requirements.pastDue)}
                </Text>
              ) : null}

              {stripeAccountQuery.data.disabledReason ? (
                <Text style={styles.errorText}>
                  Disabled reason: {stripeAccountQuery.data.disabledReason}
                </Text>
              ) : null}

              <ActionButton
                loading={isOpeningStripe}
                onPress={() => void handleStripeAction()}
                title={getStripeActionLabel(stripeAccountQuery.data)}
              />
              <ActionButton
                loading={isRefreshingAfterReturn}
                onPress={() => {
                  void refreshAfterStripeReturn("Stripe verification state refreshed.");
                }}
                title="Refresh verification state"
                variant="secondary"
              />
            </View>
          </Card>
        ) : null}

        {!stripeAccountQuery.isLoading && step === "complete" ? (
          <Card tone="success" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer setup complete</Text>
              <Text style={styles.copy}>
                Your organizer profile and payout setup are in place. You’re ready to work with paid
                events from the organizer area.
              </Text>
              <ActionButton
                onPress={() => {
                  router.replace("/organizer" as never);
                }}
                title="Open organizer home"
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  heroCopy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  heroEyebrow: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroShell: {
    gap: 14,
    padding: 20,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricValueSmall: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  providerCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  providerCardRecommended: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  providerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  providerStatusAvailable: {
    backgroundColor: palette.successSoft,
  },
  providerStatusPill: {
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  providerStatusSoon: {
    backgroundColor: palette.warningSoft,
  },
  providerStatusText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  providerStatusUnavailable: {
    backgroundColor: palette.backgroundMuted,
  },
  providerTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  providerMatrixCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  providerMatrixShell: {
    gap: 12,
    marginTop: 8,
  },
  providerMeta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  requirementList: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionShell: {
    gap: 14,
    padding: 20,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  stepPill: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepPillActive: {
    backgroundColor: palette.ink,
  },
  stepPillDisabled: {
    opacity: 0.45,
  },
  stepPillText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  stepPillTextActive: {
    color: "#ffffff",
  },
  stepPillTextDisabled: {
    color: palette.muted,
  },
  stepHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  successText: {
    color: palette.success,
    fontSize: 14,
    lineHeight: 20,
  },
  value: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
});
