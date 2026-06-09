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
  createPaystackOrganizerAccount,
  getPaystackOrganizerAccountStatus,
  listPaystackBanks,
  resolvePaystackBankAccount,
  updatePaystackOrganizerAccount,
  type PaystackBankSummary,
  type ResolvedPaystackBankAccount,
} from "@/lib/payments/paystack-organizer-account-client";
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
  paystackAccount:
    | {
        detailsSubmitted: boolean;
        isReadyForPaidEvents: boolean;
      }
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

  if (input.profile?.selectedPaymentProvider === "PAYSTACK" && input.paystackAccount?.detailsSubmitted) {
    reachable.add("verification");
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
  const [isSavingPaystackAccount, setIsSavingPaystackAccount] = useState(false);
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);
  const [isRefreshingAfterReturn, setIsRefreshingAfterReturn] = useState(false);
  const [pendingStripeReturnRefresh, setPendingStripeReturnRefresh] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [paystackBusinessName, setPaystackBusinessName] = useState("");
  const [paystackAccountHolderName, setPaystackAccountHolderName] = useState("");
  const [paystackBankSearch, setPaystackBankSearch] = useState("");
  const [paystackBankCode, setPaystackBankCode] = useState("");
  const [paystackAccountNumber, setPaystackAccountNumber] = useState("");
  const [resolvedPaystackAccount, setResolvedPaystackAccount] =
    useState<ResolvedPaystackBankAccount | null>(null);
  const [isResolvingPaystackAccount, setIsResolvingPaystackAccount] = useState(false);

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
  const paystackAccountQuery = useQuery({
    enabled: Boolean(
      session?.accessToken && organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK",
    ),
    queryFn: () => getPaystackOrganizerAccountStatus(session!.accessToken),
    queryKey: ["organizer-paystack-account", session?.accessToken],
  });
  const paystackBanksQuery = useQuery({
    enabled: Boolean(
      session?.accessToken && organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK",
    ),
    queryFn: () => listPaystackBanks(session!.accessToken),
    queryKey: ["paystack-banks", session?.accessToken],
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
        paystackAccount: paystackAccountQuery.data,
        stripeAccount: stripeAccountQuery.data,
      }),
    [organizerProfileQuery.data, paystackAccountQuery.data, stripeAccountQuery.data],
  );
  const reachableSteps = useMemo(
    () =>
      getReachableSetupSteps({
        profile: organizerProfileQuery.data,
        paystackAccount: paystackAccountQuery.data,
        stripeAccount: stripeAccountQuery.data,
      }),
    [organizerProfileQuery.data, paystackAccountQuery.data, stripeAccountQuery.data],
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
    if (paystackAccountQuery.data) {
      setPaystackBusinessName(
        paystackAccountQuery.data.businessName ??
          organizerProfileQuery.data?.businessName ??
          organizerProfileQuery.data?.displayName ??
          "",
      );
      setPaystackAccountHolderName(paystackAccountQuery.data.accountHolderName ?? "");
      setPaystackBankCode(paystackAccountQuery.data.bankCode ?? "");
      setPaystackBankSearch(paystackAccountQuery.data.bankCode ?? "");
      return;
    }

    setPaystackBusinessName(
      organizerProfileQuery.data?.businessName ?? organizerProfileQuery.data?.displayName ?? "",
    );
  }, [organizerProfileQuery.data, paystackAccountQuery.data]);

  useEffect(() => {
    setResolvedPaystackAccount(null);
    setScreenMessage((current) =>
      current?.startsWith("Resolved account owner:") ? null : current,
    );
  }, [paystackBankCode, paystackAccountNumber]);

  const filteredPaystackBanks = useMemo(() => {
    const banks = paystackBanksQuery.data ?? [];
    const query = paystackBankSearch.trim().toLowerCase();

    if (!query) {
      return banks.slice(0, 8);
    }

    return banks
      .filter(
        (bank) =>
          bank.name.toLowerCase().includes(query) || bank.code.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [paystackBankSearch, paystackBanksQuery.data]);

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
    [organizerProfileQuery, queryClient, session?.accessToken, stripeAccountQuery, paystackAccountQuery],
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

    if (organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK") {
      await Promise.all([
        paystackAccountQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: ["organizer-paystack-account", session?.accessToken],
        }),
      ]);
    }
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

  async function handlePaystackAccountSubmit() {
    if (!session?.accessToken) {
      return;
    }

    const trimmedBusinessName = paystackBusinessName.trim();
    const trimmedAccountHolderName = paystackAccountHolderName.trim();
    const trimmedBankCode = paystackBankCode.trim();
    const trimmedAccountNumber = paystackAccountNumber.trim();

    if (!trimmedBusinessName) {
      setScreenError("Add the organizer business name for this Paystack payout profile.");
      return;
    }

    if (!trimmedBankCode) {
      setScreenError("Add the Paystack bank code for this payout profile.");
      return;
    }

    if (trimmedAccountNumber.length < 6) {
      setScreenError("Add the account number for this payout profile.");
      return;
    }

    if (!resolvedPaystackAccount) {
      setScreenError("Resolve the bank account first so Maya can confirm the payout owner.");
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsSavingPaystackAccount(true);

    try {
      const payload = {
        accountHolderName: trimmedAccountHolderName || resolvedPaystackAccount.accountName,
        accountNumber: trimmedAccountNumber,
        bankCode: trimmedBankCode,
        businessName: trimmedBusinessName,
      };

      if (paystackAccountQuery.data?.detailsSubmitted) {
        await updatePaystackOrganizerAccount(session.accessToken, payload);
        setScreenMessage("Paystack payout details updated.");
      } else {
        await createPaystackOrganizerAccount(session.accessToken, payload);
        setScreenMessage(
          "Paystack payout details saved and the payout account is now connected.",
        );
      }

      setPaystackAccountNumber("");
      await refreshSetupQueries();
      setCurrentStep("verification");
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : "Paystack payout details couldn't be saved.",
      );
    } finally {
      setIsSavingPaystackAccount(false);
    }
  }

  async function handleResolvePaystackAccount() {
    if (!session?.accessToken) {
      return;
    }

    const trimmedBankCode = paystackBankCode.trim();
    const trimmedAccountNumber = paystackAccountNumber.trim();

    if (!trimmedBankCode) {
      setScreenError("Pick a bank before resolving the account.");
      return;
    }

    if (trimmedAccountNumber.length < 6) {
      setScreenError("Add the account number before resolving it.");
      return;
    }

    setScreenError(null);
    setScreenMessage(null);
    setIsResolvingPaystackAccount(true);

    try {
      const resolved = await resolvePaystackBankAccount(session.accessToken, {
        accountNumber: trimmedAccountNumber,
        bankCode: trimmedBankCode,
      });
      setResolvedPaystackAccount(resolved);
      setPaystackAccountHolderName((existing) => existing || resolved.accountName);
      setScreenMessage(`Resolved account owner: ${resolved.accountName}`);
    } catch (error) {
      setResolvedPaystackAccount(null);
      setScreenError(
        error instanceof Error ? error.message : "Paystack account resolution failed.",
      );
    } finally {
      setIsResolvingPaystackAccount(false);
    }
  }

  const step = currentStep ?? derivedStep;
  const paystackAccountLocked = Boolean(paystackAccountQuery.data?.subaccountCode);

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

        {organizerProfileQuery.isLoading || stripeAccountQuery.isLoading || paystackAccountQuery.isLoading ? (
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
                          ? derivedStep
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

        {!stripeAccountQuery.isLoading && !paystackAccountQuery.isLoading && step === "payments" ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Connect payouts</Text>
              <Text style={styles.copy}>
                {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE"
                  ? "Connect or refresh your Stripe payout account."
                  : "Add your payout details, resolve the account, then save."}
              </Text>

              {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE" && stripeAccountQuery.data ? (
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
                    {stripeAccountQuery.data.status ?? "Unknown"}
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
              ) : organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK" ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Business name</Text>
                    <TextInput
                      autoCapitalize="words"
                      editable={!paystackAccountLocked}
                      onChangeText={setPaystackBusinessName}
                      placeholder="Campus Night Limited"
                      placeholderTextColor={palette.muted}
                      style={styles.input}
                      value={paystackBusinessName}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Account holder name</Text>
                    <TextInput
                      autoCapitalize="words"
                      editable={!paystackAccountLocked}
                      onChangeText={setPaystackAccountHolderName}
                      placeholder="Campus Night Limited"
                      placeholderTextColor={palette.muted}
                      style={styles.input}
                      value={paystackAccountHolderName}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Find your bank</Text>
                    <TextInput
                      autoCapitalize="words"
                      editable={!paystackAccountLocked}
                      onChangeText={setPaystackBankSearch}
                      placeholder="Search bank name"
                      placeholderTextColor={palette.muted}
                      style={styles.input}
                      value={paystackBankSearch}
                    />
                  </View>

                  {paystackBanksQuery.isLoading ? (
                    <Text style={styles.copy}>Loading Paystack bank list…</Text>
                  ) : null}

                  {filteredPaystackBanks.length ? (
                    <View style={styles.bankList}>
                      {filteredPaystackBanks.map((bank: PaystackBankSummary) => {
                        const isSelected = paystackBankCode === bank.code;

                        return (
                          <Pressable
                            disabled={paystackAccountLocked}
                            key={bank.code}
                            onPress={() => {
                              setPaystackBankCode(bank.code);
                              setPaystackBankSearch(bank.name);
                            }}
                            style={[
                              styles.bankOption,
                              isSelected ? styles.bankOptionSelected : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.bankOptionTitle,
                                isSelected ? styles.bankOptionTitleSelected : null,
                              ]}
                            >
                              {bank.name}
                            </Text>
                            <Text style={styles.bankOptionMeta}>{bank.code}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Bank code</Text>
                    <TextInput
                      autoCapitalize="characters"
                      editable={!paystackAccountLocked}
                      onChangeText={setPaystackBankCode}
                      placeholder="058"
                      placeholderTextColor={palette.muted}
                      style={styles.input}
                      value={paystackBankCode}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Account number</Text>
                    <TextInput
                      editable={!paystackAccountLocked}
                      keyboardType="number-pad"
                      onChangeText={setPaystackAccountNumber}
                      placeholder={
                        paystackAccountQuery.data?.maskedAccountNumber ?? "0123456789"
                      }
                      placeholderTextColor={palette.muted}
                      style={styles.input}
                      value={paystackAccountNumber}
                    />
                  </View>

                  {paystackAccountQuery.data?.requirementsSummary ? (
                    <Text style={styles.copy}>{paystackAccountQuery.data.requirementsSummary}</Text>
                  ) : null}

                  {paystackAccountLocked ? (
                    <Card tone="warning">
                      <Text style={styles.metricLabel}>Connected payout account</Text>
                      <Text style={styles.copy}>
                        This payout account is already connected. Editing live details will come in
                        a follow-up wave.
                      </Text>
                    </Card>
                  ) : null}

                  {resolvedPaystackAccount ? (
                    <Card tone="accent">
                      <Text style={styles.metricLabel}>Resolved account owner</Text>
                      <Text style={styles.value}>{resolvedPaystackAccount.accountName}</Text>
                      <Text style={styles.providerMeta}>
                        {resolvedPaystackAccount.accountNumber} • {resolvedPaystackAccount.bankCode}
                      </Text>
                    </Card>
                  ) : null}

                  <ActionButton
                    disabled={paystackAccountLocked}
                    loading={isResolvingPaystackAccount}
                    onPress={() => void handleResolvePaystackAccount()}
                    title="Resolve account name"
                    variant="secondary"
                  />

                  <ActionButton
                    disabled={paystackAccountLocked}
                    loading={isSavingPaystackAccount}
                    onPress={() => void handlePaystackAccountSubmit()}
                    title={
                      paystackAccountLocked
                        ? "Paystack account connected"
                        : paystackAccountQuery.data?.detailsSubmitted
                        ? "Update Paystack payout details"
                        : "Save Paystack payout details"
                    }
                  />
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

        {!stripeAccountQuery.isLoading && !paystackAccountQuery.isLoading && step === "verification" ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Verification</Text>
              <Text style={styles.copy}>
                {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE"
                  ? "We’re checking whether Stripe has everything needed for paid event publishing and payouts."
                  : "We’ve created the Paystack payout profile. Maya is now checking whether the subaccount is active and verified for paid events."}
              </Text>
              {organizerProfileQuery.data?.selectedPaymentProvider === "STRIPE" &&
              stripeAccountQuery.data ? (
                <>
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
                </>
              ) : organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK" &&
                paystackAccountQuery.data ? (
                <>
                  <Text style={styles.value}>
                    {paystackAccountQuery.data.detailsSubmitted
                      ? "Paystack payout details are saved."
                      : "Paystack payout details still need attention."}
                  </Text>

                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Business</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.businessName ?? "Pending"}
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Bank code</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.bankCode ?? "Pending"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Account</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.maskedAccountNumber ?? "Pending"}
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Verification</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.verificationStatus ?? "Pending"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Subaccount</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.subaccountCode ?? "Pending"}
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Payouts</Text>
                      <Text style={styles.metricValueSmall}>
                        {paystackAccountQuery.data.payoutsEnabled ? "Enabled" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  {paystackAccountQuery.data.requirementsSummary ? (
                    <Text style={styles.copy}>{paystackAccountQuery.data.requirementsSummary}</Text>
                  ) : null}

                  <ActionButton
                    onPress={() => {
                      setCurrentStep("payments");
                    }}
                    title="Review payout details"
                    variant="secondary"
                  />
                </>
              ) : null}
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
  bankList: {
    gap: 8,
  },
  bankOption: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bankOptionMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  bankOptionSelected: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  bankOptionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  bankOptionTitleSelected: {
    color: palette.accentDeep,
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
