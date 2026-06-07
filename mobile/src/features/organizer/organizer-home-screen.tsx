import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { canManageOrganizerEvents, hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import {
  deriveOrganizerSetupStep,
  isOrganizerProfileReadyForPayments,
} from "@/features/organizer/organizer-setup-flow";
import { formatDateTime } from "@/lib/formatters";
import {
  getOrganizerManageableEventIds,
  listOrganizerEvents,
} from "@/lib/organizer/events-client";
import { getOrganizerProfile } from "@/lib/organizer/organizer-profile-client";
import {
  createStripeConnectOnboardingLink,
  getOrganizerPayoutVisibility,
  getStripeConnectAccountStatus,
  refreshStripeConnectOnboardingLink,
} from "@/lib/payments/stripe-connect-client";
import { palette } from "@/styles/theme";

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value));
}

function getPaymentActionLabel(input: {
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
    return "Refresh payment status";
  }

  if (input.requirements.pastDue.length > 0 || input.onboardingStatus === "RESTRICTED") {
    return "Resolve Stripe requirements";
  }

  return "Resume Stripe onboarding";
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
  const payoutVisibilityQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => getOrganizerPayoutVisibility(session!.accessToken),
    queryKey: ["organizer-payout-visibility", session?.accessToken],
  });

  const manageableEvents = (eventsQuery.data ?? []).filter((event) =>
    manageableEventIds.includes(event.id),
  );
  const setupStep = deriveOrganizerSetupStep({
    profile: organizerProfileQuery.data,
    stripeAccount: stripeAccountQuery.data,
  });
  const organizerSetupComplete = setupStep === "complete";

  async function handleStripeAction() {
    if (!session?.accessToken) {
      return;
    }

    const account = stripeAccountQuery.data;
    setPaymentMessage(null);
    setIsOpeningStripe(true);

    try {
      const response =
        account?.connectedAccountId && !account.isReadyForPaidEvents
          ? await refreshStripeConnectOnboardingLink(session.accessToken)
          : account?.connectedAccountId
            ? null
            : await createStripeConnectOnboardingLink(session.accessToken);

      if (response?.onboardingUrl) {
        await WebBrowser.openBrowserAsync(response.onboardingUrl);
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
                Connect Stripe so paid events can publish and revenue can settle to your account.
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

                  {stripeAccountQuery.isLoading ? (
                    <Text style={styles.copy}>Checking Stripe account readiness.</Text>
                  ) : null}

                  {stripeAccountQuery.data ? (
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

                      {payoutVisibilityQuery.data ? (
                        <View style={styles.paymentStatusRow}>
                          <View style={styles.metricCardInline}>
                            <Text style={styles.metricLabelInline}>Net earnings</Text>
                            <Text style={styles.metricValueInline}>
                              {formatMoney(
                                payoutVisibilityQuery.data.netEarnings,
                                payoutVisibilityQuery.data.currency,
                              )}
                            </Text>
                          </View>
                          <View style={styles.metricCardInline}>
                            <Text style={styles.metricLabelInline}>On hold</Text>
                            <Text style={styles.metricValueInline}>
                              {formatMoney(
                                payoutVisibilityQuery.data.onHoldAmount,
                                payoutVisibilityQuery.data.currency,
                              )}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      <ActionButton
                        loading={isOpeningStripe}
                        onPress={() => void handleStripeAction()}
                        title={getPaymentActionLabel(stripeAccountQuery.data)}
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
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{event.status}</Text>
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
                  <ActionButton
                    onPress={() => router.push(`/organizer/${event.slug}` as never)}
                    title="Manage event"
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
