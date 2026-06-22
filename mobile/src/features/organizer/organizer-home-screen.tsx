import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { canManageOrganizerEvents, hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import {
  deriveOrganizerSetupStep,
  isOrganizerProfileReadyForPayments,
} from "@/features/organizer/organizer-setup-flow";
import { formatDateTime, getCurrencyLocale } from "@/lib/formatters";
import {
  getOrganizerManageableEventIds,
  listOrganizerEvents,
} from "@/lib/organizer/events-client";
import { getOrganizerProfile } from "@/lib/organizer/organizer-profile-client";
import { getPaystackOrganizerAccountStatus } from "@/lib/payments/paystack-organizer-account-client";
import {
  createStripeConnectOnboardingLink,
  getOrganizerPayoutVisibility,
  getStripeConnectAccountStatus,
  refreshStripeConnectOnboardingLink,
} from "@/lib/payments/stripe-connect-client";
import {
  buildStripeConnectRedirectUrls,
  openStripeConnectOnboardingSession,
} from "@/lib/payments/stripe-connect-onboarding";
import { palette } from "@/styles/theme";

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value));
}

function getPaymentActionLabel(input: {
  provider: "STRIPE" | "PAYSTACK" | "MANUAL" | null | undefined;
  connectedAccountId: string | null;
  isReadyForPaidEvents: boolean;
  onboardingStatus: string | null;
  requirements: {
    currentlyDue: string[];
    pastDue: string[];
  };
}) {
  if (input.provider === "PAYSTACK") {
    return input.isReadyForPaidEvents ? "Review Paystack status" : "Continue Paystack setup";
  }

  if (!input.connectedAccountId) {
    return "Connect Stripe";
  }

  if (input.isReadyForPaidEvents) {
    return "Refresh payment status";
  }

  if (input.requirements.pastDue.length > 0 || input.onboardingStatus === "RESTRICTED") {
    return "Resolve Stripe requirements";
  }

  return "Resume Stripe onboarding";
}

function getSelectedProviderLabel(provider: "STRIPE" | "PAYSTACK" | "MANUAL" | null | undefined) {
  if (provider === "PAYSTACK") {
    return "Paystack";
  }

  if (provider === "MANUAL") {
    return "Manual";
  }

  return "Stripe";
}

function getEventReadinessTone(input: {
  hasPaidTicketTypes: boolean;
  canPublishPaidEvent: boolean;
}) {
  if (!input.hasPaidTicketTypes) {
    return {
      label: "Free-ready",
      message: "No paid ticket types yet. Free publishing is clear.",
    };
  }

  if (input.canPublishPaidEvent) {
    return {
      label: "Paid-ready",
      message: "Paid ticket setup is clear for publishing.",
    };
  }

  return {
    label: "Blocked",
    message: "Paid publishing is blocked until payout readiness is complete.",
  };
}

export function OrganizerHomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);
  const manageableEventIds = getOrganizerManageableEventIds(session?.user.memberships ?? []);
  const eventsQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => listOrganizerEvents(session!.accessToken),
    queryKey: ["organizer-events", session?.accessToken],
  });
  const organizerProfileQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => getOrganizerProfile(session!.accessToken),
    queryKey: ["organizer-profile", session?.accessToken],
  });
  const stripeAccountQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => getStripeConnectAccountStatus(session!.accessToken),
    queryKey: ["organizer-stripe-account", session?.accessToken],
  });
  const paystackAccountQuery = useQuery({
    enabled: Boolean(
      session?.accessToken &&
        hasSurfaceAccess &&
        organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK",
    ),
    queryFn: () => getPaystackOrganizerAccountStatus(session!.accessToken),
    queryKey: ["organizer-paystack-account", session?.accessToken],
  });
  const payoutVisibilityQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => getOrganizerPayoutVisibility(session!.accessToken),
    queryKey: ["organizer-payout-visibility", session?.accessToken],
  });

  const manageableEvents = (eventsQuery.data ?? []).filter((event) =>
    manageableEventIds.includes(event.id),
  );
  const blockedPaidEventsCount = manageableEvents.filter(
    (event) =>
      event.paymentReadiness.hasPaidTicketTypes &&
      !event.paymentReadiness.canPublishPaidEvent,
  ).length;
  const setupStep = deriveOrganizerSetupStep({
    paystackAccount: paystackAccountQuery.data,
    profile: organizerProfileQuery.data,
    stripeAccount: stripeAccountQuery.data,
  });
  const organizerSetupComplete = setupStep === "complete";
  const selectedPaymentProvider = organizerProfileQuery.data?.selectedPaymentProvider ?? null;
  const payoutVisibility = payoutVisibilityQuery.data;

  async function handleStripeAction() {
    if (!session?.accessToken) {
      return;
    }

    const account = stripeAccountQuery.data;
    setPaymentMessage(null);
    setIsOpeningStripe(true);

    try {
      const redirectUrls = buildStripeConnectRedirectUrls("/organizer");
      const stripeLinkPayload = {
        refreshUrl: redirectUrls.refreshUrl,
        returnUrl: redirectUrls.returnUrl,
      };
      const response =
        account?.connectedAccountId && !account.isReadyForPaidEvents
          ? await refreshStripeConnectOnboardingLink(session.accessToken, stripeLinkPayload)
          : account?.connectedAccountId
            ? null
            : await createStripeConnectOnboardingLink(session.accessToken, stripeLinkPayload);

      if (response?.onboardingUrl) {
        await openStripeConnectOnboardingSession(
          response.onboardingUrl,
          redirectUrls.appReturnUrl,
        );
        setPaymentMessage("Returned from Stripe. Refreshing account readiness.");
      } else {
        setPaymentMessage("Stripe status refreshed.");
      }

      await Promise.all([stripeAccountQuery.refetch(), payoutVisibilityQuery.refetch()]);
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : "Stripe onboarding couldn't be opened right now.",
      );
    } finally {
      setIsOpeningStripe(false);
    }
  }

  return (
    <Screen
      title="Organizer"
      subtitle="Manage your events."
      compactHeader
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Organizer tools</Text>
            <Text style={styles.heroTitle}>Keep event operations moving.</Text>
            <Text style={styles.heroCopy}>Open an event and update fast.</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Manageable events</Text>
                <Text style={styles.metricValue}>{manageableEvents.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Organizer access</Text>
                <Text style={styles.metricValue}>
                  {canManageOrganizerEvents(session?.user) ? "Ready" : "Limited"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Blocked paid events</Text>
                <Text style={styles.metricValue}>{blockedPaidEventsCount}</Text>
              </View>
            </View>
          </View>
        </Card>

        {!hasSurfaceAccess ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer access isn't enabled here</Text>
              <Text style={styles.copy}>
                This account is signed in for attendee use only. Sign in with an organizer-capable
                account to manage events on mobile.
              </Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && eventsQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading events</Text>
              <Text style={styles.copy}>Pulling your manageable events now.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && eventsQuery.isError ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Events couldn't be loaded</Text>
              <Text style={styles.copy}>
                We couldn't refresh your organizer list right now. Try again in a moment.
              </Text>
              <ActionButton onPress={() => void eventsQuery.refetch()} title="Retry organizer list" />
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && !eventsQuery.isLoading && !manageableEvents.length ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>No manageable events yet</Text>
              <Text style={styles.copy}>
                Start your first event draft here, then come back to refine ticket types, media,
                staff access, and publish readiness.
              </Text>
              <ActionButton
                onPress={() => {
                  router.push("/organizer/create" as never);
                }}
                title="Create your first event"
              />
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && organizerProfileQuery.data ? (
          <Card
            tone={organizerSetupComplete ? "success" : "warning"}
            padded={false}
          >
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer setup</Text>
              <Text style={styles.copy}>
                {organizerSetupComplete
                  ? "Your organizer profile and payout setup are in good shape."
                  : "Complete your organizer setup before relying on paid event workflows."}
              </Text>
              <Text style={styles.value}>
                Current step: {setupStep === "complete" ? "ready to go" : setupStep}
              </Text>

              {!isOrganizerProfileReadyForPayments(organizerProfileQuery.data) ? (
                <Text style={styles.warningText}>
                  Add your organizer name, country, and default payout currency first.
                </Text>
              ) : null}

              <ActionButton
                onPress={() => {
                  router.push("/organizer/setup" as never);
                }}
                title={organizerSetupComplete ? "Review organizer setup" : "Continue organizer setup"}
                variant={organizerSetupComplete ? "secondary" : "primary"}
              />
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Payments</Text>
              <Text style={styles.copy}>
                {selectedPaymentProvider
                  ? `${getSelectedProviderLabel(selectedPaymentProvider)} controls payout readiness. Maya keeps revenue totals consistent here across providers.`
                  : "Choose a payout provider so paid events can publish and organizer revenue can settle correctly."}
              </Text>

              {!organizerProfileQuery.data || !isOrganizerProfileReadyForPayments(organizerProfileQuery.data) ? (
                <>
                  <Text style={styles.warningText}>
                    Finish organizer setup before starting payout onboarding.
                  </Text>
                  <ActionButton
                    onPress={() => {
                      router.push("/organizer/setup" as never);
                    }}
                    title="Open organizer setup"
                  />
                </>
              ) : (
                <>

                  {selectedPaymentProvider === "PAYSTACK" && paystackAccountQuery.isLoading ? (
                    <Text style={styles.copy}>Checking Paystack payout readiness.</Text>
                  ) : null}

                  {selectedPaymentProvider !== "PAYSTACK" && stripeAccountQuery.isLoading ? (
                    <Text style={styles.copy}>Checking Stripe account readiness.</Text>
                  ) : null}

                  {selectedPaymentProvider === "PAYSTACK" && paystackAccountQuery.data ? (
                    <>
                      <View style={styles.paymentStatusRow}>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Paid events</Text>
                          <Text style={styles.metricValueInline}>
                            {paystackAccountQuery.data.isReadyForPaidEvents ? "Ready" : "Action needed"}
                          </Text>
                        </View>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Payout account</Text>
                          <Text style={styles.metricValueInline}>
                            {paystackAccountQuery.data.payoutAccountCode ?? "Pending"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.copy}>
                        {paystackAccountQuery.data.isReadyForPaidEvents
                          ? "Paystack is connected and ready for paid event publishing."
                          : paystackAccountQuery.data.detailsSubmitted
                            ? "Paystack payout details are saved, but verification or activation still needs attention."
                            : "No Paystack organizer payout profile is linked yet."}
                      </Text>

                      {paystackAccountQuery.data.requirementsSummary ? (
                        <Text style={styles.warningText}>
                          {paystackAccountQuery.data.requirementsSummary}
                        </Text>
                      ) : null}

                      <ActionButton
                        onPress={() => {
                          router.push("/organizer/setup" as never);
                        }}
                        title={getPaymentActionLabel({
                          provider: "PAYSTACK",
                          connectedAccountId: paystackAccountQuery.data.payoutAccountCode,
                          isReadyForPaidEvents: paystackAccountQuery.data.isReadyForPaidEvents,
                          onboardingStatus: paystackAccountQuery.data.onboardingStatus,
                          requirements: { currentlyDue: [], pastDue: [] },
                        })}
                      />
                    </>
                  ) : null}

                  {selectedPaymentProvider !== "PAYSTACK" && stripeAccountQuery.data ? (
                    <>
                      <View style={styles.paymentStatusRow}>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Paid events</Text>
                          <Text style={styles.metricValueInline}>
                            {stripeAccountQuery.data.isReadyForPaidEvents ? "Ready" : "Action needed"}
                          </Text>
                        </View>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Payouts</Text>
                          <Text style={styles.metricValueInline}>
                            {stripeAccountQuery.data.payoutsEnabled ? "Enabled" : "Pending"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.copy}>
                        {stripeAccountQuery.data.connectedAccountId
                          ? stripeAccountQuery.data.isReadyForPaidEvents
                            ? "Stripe is connected and ready for paid event publishing."
                            : "Stripe is connected, but onboarding or verification still needs attention."
                          : "No Stripe Connect account is linked yet."}
                      </Text>

                      {stripeAccountQuery.data.requirements.pastDue.length > 0 ? (
                        <Text style={styles.warningText}>
                          Past due requirements: {stripeAccountQuery.data.requirements.pastDue.join(", ")}
                        </Text>
                      ) : null}

                      <ActionButton
                        loading={isOpeningStripe}
                        onPress={() => void handleStripeAction()}
                        title={getPaymentActionLabel({
                          provider: "STRIPE",
                          ...stripeAccountQuery.data,
                        })}
                      />
                    </>
                  ) : null}

                  {stripeAccountQuery.isError ? (
                    <ActionButton
                      onPress={() => void stripeAccountQuery.refetch()}
                      title="Retry payment status"
                      variant="secondary"
                    />
                  ) : null}

                  {paymentMessage ? <Text style={styles.copy}>{paymentMessage}</Text> : null}

                  {payoutVisibility ? (
                    <View style={styles.revenueShell}>
                      <Text style={styles.sectionHint}>Revenue snapshot</Text>
                      <View style={styles.paymentStatusRow}>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Gross sales</Text>
                          <Text style={styles.metricValueInline}>
                            {formatMoney(payoutVisibility.grossSales, payoutVisibility.currency)}
                          </Text>
                        </View>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Net earnings</Text>
                          <Text style={styles.metricValueInline}>
                            {formatMoney(payoutVisibility.netEarnings, payoutVisibility.currency)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paymentStatusRow}>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Platform fees</Text>
                          <Text style={styles.metricValueInline}>
                            {formatMoney(payoutVisibility.platformFees, payoutVisibility.currency)}
                          </Text>
                        </View>
                        <View style={styles.metricCardInline}>
                          <Text style={styles.metricLabelInline}>Refunded</Text>
                          <Text style={styles.metricValueInline}>
                            {formatMoney(payoutVisibility.refundedAmount, payoutVisibility.currency)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </Card>
        ) : null}

        {manageableEvents.length ? (
          <Card density="dense" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Your events</Text>
              <Text style={styles.copy}>Open any event to manage it, or create a fresh draft.</Text>
              <ActionButton
                onPress={() => {
                  router.push("/organizer/create" as never);
                }}
                title="Create event"
                variant="secondary"
              />

              {manageableEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventPills}>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{event.status}</Text>
                      </View>
                      <View
                        style={[
                          styles.readinessPill,
                          event.paymentReadiness.hasPaidTicketTypes &&
                          !event.paymentReadiness.canPublishPaidEvent
                            ? styles.readinessPillWarning
                            : event.paymentReadiness.canPublishPaidEvent
                              ? styles.readinessPillSuccess
                              : styles.readinessPillNeutral,
                        ]}
                      >
                        <Text
                          style={[
                            styles.readinessPillText,
                            event.paymentReadiness.hasPaidTicketTypes &&
                            !event.paymentReadiness.canPublishPaidEvent
                              ? styles.readinessPillTextWarning
                              : event.paymentReadiness.canPublishPaidEvent
                                ? styles.readinessPillTextSuccess
                                : null,
                          ]}
                        >
                          {getEventReadinessTone(event.paymentReadiness).label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.eventMeta} numberOfLines={1}>🗓 {formatDateTime(event.startsAt)}</Text>
                  <View style={styles.metaStrip}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>
                        🎟 {event.ticketTypes.length} type{event.ticketTypes.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {event.venueName ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>📍 {event.venueName}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={
                      event.paymentReadiness.hasPaidTicketTypes &&
                      !event.paymentReadiness.canPublishPaidEvent
                        ? styles.warningText
                        : styles.copy
                    }
                  >
                    {event.paymentReadiness.blockingMessage ??
                      getEventReadinessTone(event.paymentReadiness).message}
                  </Text>
                  <ActionButton
                    onPress={() => router.push(`/organizer/${event.slug}` as never)}
                    title={
                      event.paymentReadiness.hasPaidTicketTypes &&
                      !event.paymentReadiness.canPublishPaidEvent
                        ? "Resolve publish readiness"
                        : "Manage event"
                    }
                  />
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 48,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  eventCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  eventPills: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  eventMeta: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  eventTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    opacity: 0.9,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroShell: {
    backgroundColor: palette.black,
    gap: 14,
    padding: 22,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
    maxWidth: 320,
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 84,
    padding: 14,
  },
  metricLabel: {
    color: "#dbc7b6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metricCardInline: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 72,
    padding: 12,
  },
  metricLabelInline: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metricValueInline: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  readinessPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readinessPillNeutral: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderWidth: 1,
  },
  readinessPillSuccess: {
    backgroundColor: palette.successSoft,
    borderColor: "#a8d7c1",
    borderWidth: 1,
  },
  readinessPillText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  readinessPillTextSuccess: {
    color: palette.successDeep,
  },
  readinessPillTextWarning: {
    color: palette.warning,
  },
  readinessPillWarning: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
    borderWidth: 1,
  },
  metricValue: {
    color: palette.white,
    fontSize: 20,
    fontWeight: "700",
  },
  metaChip: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  value: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  paymentStatusRow: {
    flexDirection: "row",
    gap: 10,
  },
  revenueShell: {
    gap: 10,
  },
  warningText: {
    color: "#8c5a00",
    fontSize: 14,
    lineHeight: 20,
  },
  statusPill: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    color: palette.warning,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
