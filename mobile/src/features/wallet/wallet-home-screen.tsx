import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { useWalletSync } from "@/components/providers/wallet-sync-provider";
import { CollapsibleSection } from "@/components/section-primitives";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, EmptyStateCard, LoadingStateCard, Screen } from "@/components/ui";
import { getTicketStatusMeta, groupTicketsByEvent } from "@/features/wallet/wallet-model";
import { formatDateTime } from "@/lib/formatters";
import { getOrderById } from "@/lib/orders/orders-client";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";
import { listOwnedTickets } from "@/lib/tickets/tickets-client";
import { commonStyles } from "@/styles/common";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function WalletHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recentOrderId?: string }>();
  const { session } = useAuth();
  const { clearTicketStatusOverride, getTicketStatusOverride } = useWalletSync();
  const [isPriorityExpanded, setIsPriorityExpanded] = useState(true);
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});
  const walletQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listOwnedTickets(session!.accessToken, { sort: "asc" }),
    queryKey: ["owned-tickets", session?.accessToken],
  });
  const recentOrderId =
    typeof params.recentOrderId === "string" && params.recentOrderId.trim()
      ? params.recentOrderId
      : undefined;
  const recentOrderQuery = useQuery({
    enabled: Boolean(session?.accessToken && recentOrderId),
    queryFn: () => getOrderById(recentOrderId!, session!.accessToken),
    queryKey: ["wallet-recent-order", recentOrderId, session?.accessToken],
    retry: 1,
  });
  const ticketsWithOverrides: OwnedTicketSummary[] = useMemo(
    () =>
      (walletQuery.data ?? []).map((ticket) => {
        const overrideStatus = getTicketStatusOverride(ticket.serialNumber);

        if (!overrideStatus) {
          return ticket;
        }

        return {
          ...ticket,
          status: overrideStatus,
        };
      }),
    [getTicketStatusOverride, walletQuery.data],
  );

  useEffect(() => {
    for (const ticket of walletQuery.data ?? []) {
      const overrideStatus = getTicketStatusOverride(ticket.serialNumber);

      if (overrideStatus && overrideStatus === ticket.status) {
        clearTicketStatusOverride(ticket.serialNumber);
      }
    }
  }, [clearTicketStatusOverride, getTicketStatusOverride, walletQuery.data]);

  const groupedTickets = groupTicketsByEvent(ticketsWithOverrides);
  const primaryTicket = groupedTickets[0]?.tickets[0] ?? null;
  const walletTicketCount = ticketsWithOverrides.length;

  const effectiveExpandedEventIds = useMemo(
    () =>
      Object.fromEntries(
        groupedTickets.map((group, index) => [
          group.event.id,
          expandedEventIds[group.event.id] ?? index === 0,
        ]),
      ),
    [expandedEventIds, groupedTickets],
  );

  function openTicket(serialNumber: string) {
    router.push({
      params: { serialNumber },
      pathname: "/tickets/[serialNumber]",
    });
  }

  return (
    <Screen
      title={session?.user.firstName ? `${session.user.firstName}'s wallet` : "Ticket wallet"}
      subtitle="Your tickets."
      compactHeader
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />
            <Text style={styles.heroEyebrow}>Live wallet</Text>
            <Text style={styles.heroHeadline}>Everything you need for your next event.</Text>
            <Text style={styles.heroCopy}>Your active passes, at a glance.</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Owned now</Text>
                <Text style={styles.metricValue}>{walletTicketCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Next event</Text>
                <Text style={styles.metricValueSmall}>
                  {primaryTicket ? primaryTicket.event.title : "Waiting"}
                </Text>
              </View>
            </View>

            <ActionButton
              onPress={() => router.push("/(public)")}
              title="Explore events"
              variant="secondary"
            />
          </View>
        </Card>

        {recentOrderQuery.data ? (
          <Card tone="success">
            <Text style={styles.sectionTitle}>Recent purchase</Text>
            <Text style={styles.copy}>
              {recentOrderQuery.data.event.title} is now in your wallet.
              {recentOrderQuery.data.tickets.length > 0
                ? ` ${recentOrderQuery.data.tickets.length} ticket${recentOrderQuery.data.tickets.length === 1 ? "" : "s"} arrived successfully.`
                : " Payment confirmed. Ticket issuance is still finalizing."}
            </Text>
            <View style={styles.purchaseMetaRow}>
              <Text style={styles.purchaseMetaLabel}>🧾 Order</Text>
              <Text style={styles.purchaseMetaValue}>{recentOrderQuery.data.id}</Text>
            </View>
            <View style={styles.purchaseMetaRow}>
              <Text style={styles.purchaseMetaLabel}>💳 Total</Text>
              <Text style={styles.purchaseMetaValue}>
                {new Intl.NumberFormat("en-IE", {
                  currency: recentOrderQuery.data.currency,
                  style: "currency",
                }).format(Number(recentOrderQuery.data.totalAmount))}
              </Text>
            </View>
            {recentOrderQuery.data.tickets[0] ? (
              <ActionButton
                onPress={() => openTicket(recentOrderQuery.data!.tickets[0]!.serialNumber)}
                title="Open first new ticket"
              />
            ) : (
              <ActionButton
                onPress={() => void recentOrderQuery.refetch()}
                title="Refresh purchase state"
                variant="secondary"
              />
            )}
          </Card>
        ) : null}

        {walletQuery.isLoading ? (
          <>
            <LoadingStateCard title="Preparing your wallet" subtitle="Loading your latest tickets." />
            <Card padded={false}>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonLineLg} />
                <View style={styles.skeletonLineMd} />
                <View style={styles.skeletonRow}>
                  <View style={styles.skeletonPill} />
                  <View style={styles.skeletonPill} />
                </View>
                <View style={styles.skeletonButton} />
              </View>
            </Card>
            <Card padded={false}>
              <View style={styles.skeletonListCard}>
                <View style={styles.skeletonLineMd} />
                <View style={styles.skeletonLineSm} />
              </View>
            </Card>
          </>
        ) : null}

        {walletQuery.isError ? (
          <>
            <Card tone="warning">
              <Text style={styles.sectionTitle}>Wallet needs another try</Text>
              <Text style={styles.copy}>We couldn't load your latest ticket status.</Text>
              <ActionButton onPress={() => void walletQuery.refetch()} title="Retry wallet" />
            </Card>
            <SupportCard
              body="If a paid ticket or accepted transfer still does not appear after refreshing, contact support with the event name and any order or ticket reference you have."
              subject="TicketSystem wallet lookup issue"
              title="Still not seeing the latest wallet state?"
            />
          </>
        ) : null}

        {!walletQuery.isLoading && !walletQuery.isError && !primaryTicket ? (
          <EmptyStateCard
            action={() => router.push("/(public)")}
            actionTitle="Explore events"
            secondaryAction={() => router.push("/(tabs)/activity" as never)}
            secondaryActionTitle="Open activity center"
            subtitle="You don't have tickets yet."
            title="Your wallet is ready"
          />
        ) : null}

        {primaryTicket ? (
          <CollapsibleSection
            expanded={isPriorityExpanded}
            onToggle={() => {
              animateLayout();
              setIsPriorityExpanded((current) => !current);
            }}
            statusLabel={primaryTicket.status.replaceAll("_", " ")}
            subtitle={`🎟 ${primaryTicket.ticketType.name} · 🗓 ${formatDateTime(primaryTicket.event.startsAt)}`}
            title="Priority ticket"
          >
            <View style={styles.primaryTicketShell}>
              <View style={styles.primaryTicketTop}>
                <View style={styles.primaryTicketHeading}>
                  <Text style={styles.eyebrow}>Up next</Text>
                  <Text style={styles.heroTitle}>{primaryTicket.event.title}</Text>
                  <Text style={styles.copy} numberOfLines={1}>{getTicketStatusMeta(primaryTicket.status).description}</Text>
                </View>
              </View>

              <View style={styles.detailStrip}>
                <View style={styles.detailTile}>
                  <Text style={styles.detailLabel}>Readiness</Text>
                  <Text style={styles.detailValue}>
                    {getTicketStatusMeta(primaryTicket.status).description}
                  </Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.detailLabel}>Serial</Text>
                  <Text style={styles.detailValueMono}>{primaryTicket.serialNumber}</Text>
                </View>
              </View>

              <ActionButton onPress={() => openTicket(primaryTicket.serialNumber)} title="Open ticket" />
            </View>
          </CollapsibleSection>
        ) : null}

        {groupedTickets.map((group) => (
          <CollapsibleSection
            key={group.event.id}
            expanded={Boolean(effectiveExpandedEventIds[group.event.id])}
            onToggle={() => {
              animateLayout();
              setExpandedEventIds((current) => ({
                ...current,
                [group.event.id]: !current[group.event.id],
              }));
            }}
            statusLabel={`${group.tickets.length} ticket${group.tickets.length > 1 ? "s" : ""}`}
            subtitle={`🗓 ${formatDateTime(group.event.startsAt)}`}
            title={group.event.title}
          >
            <View style={styles.group}>
              {group.tickets.map((ticket) => {
                const meta = getTicketStatusMeta(ticket.status);

                return (
                  <Card
                    key={ticket.id}
                    tone={meta.tone === "success" ? "success" : "default"}
                    padded={false}
                  >
                    <View style={styles.ticketCardShell}>
                      <View style={styles.ticketHeaderRow}>
                        <View style={styles.ticketHeaderText}>
                          <Text style={styles.ticketTitle}>{ticket.ticketType.name}</Text>
                          <Text numberOfLines={1} style={styles.copy}>{meta.description}</Text>
                        </View>
                        <View style={styles.smallStatusPill}>
                          <Text style={styles.smallStatusPillText}>
                            {ticket.status.replaceAll("_", " ")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ticketFooterRow}>
                        <View>
                          <Text style={styles.serialLabel}>🔖 Serial</Text>
                          <Text style={styles.serial}>{ticket.serialNumber}</Text>
                        </View>
                        <ActionButton
                          onPress={() => openTicket(ticket.serialNumber)}
                          title="View detail"
                          variant="secondary"
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </CollapsibleSection>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    ...commonStyles.contentContainer,
  },
  copy: {
    ...commonStyles.bodyCopy,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  detailStrip: {
    ...commonStyles.heroDarkMetricRow,
    marginTop: 0,
  },
  detailTile: {
    backgroundColor: palette.glass,
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  detailValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  detailValueMono: {
    color: palette.ink,
    fontFamily: "Courier",
    fontSize: 13,
    fontWeight: "700",
  },
  eyebrow: {
    color: palette.successDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  group: {
    gap: 12,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "800",
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 290,
    opacity: 0.9,
  },
  heroEyebrow: {
    ...commonStyles.heroDarkEyebrow,
  },
  heroGlowPrimary: {
    backgroundColor: "rgba(255, 213, 162, 0.22)",
    borderRadius: 999,
    height: 220,
    position: "absolute",
    right: -40,
    top: -40,
    width: 220,
  },
  heroGlowSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 180,
    left: -30,
    position: "absolute",
    top: 90,
    width: 180,
  },
  heroHeadline: {
    color: palette.white,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36,
    maxWidth: 320,
  },
  heroShell: {
    ...commonStyles.heroDarkShell,
    overflow: "hidden",
    position: "relative",
  },
  metricCard: {
    ...commonStyles.heroDarkMetricCard,
  },
  metricLabel: {
    ...commonStyles.heroDarkMetricLabel,
  },
  metricRow: {
    ...commonStyles.heroDarkMetricRow,
  },
  metricValue: {
    color: palette.white,
    fontSize: 30,
    fontWeight: "800",
  },
  metricValueSmall: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryTicketHeading: {
    gap: 6,
  },
  primaryTicketShell: {
    gap: 16,
  },
  purchaseMetaLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  purchaseMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  purchaseMetaValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  primaryTicketTop: {
    gap: 12,
  },
  sectionTitle: {
    ...commonStyles.headingLg,
  },
  skeletonButton: {
    backgroundColor: "#eadcca",
    borderRadius: 999,
    height: 44,
    marginTop: 6,
    width: "62%",
  },
  skeletonCard: {
    backgroundColor: "#fff7eb",
    borderColor: palette.divider,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  skeletonLineLg: {
    backgroundColor: "#e9dac7",
    borderRadius: 8,
    height: 20,
    width: "72%",
  },
  skeletonLineMd: {
    backgroundColor: "#eee1d0",
    borderRadius: 8,
    height: 14,
    width: "88%",
  },
  skeletonLineSm: {
    backgroundColor: "#eee1d0",
    borderRadius: 8,
    height: 12,
    width: "60%",
  },
  skeletonListCard: {
    backgroundColor: "#fff7eb",
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  skeletonPill: {
    backgroundColor: "#e8d8c5",
    borderRadius: 999,
    height: 26,
    width: 110,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  serial: {
    color: palette.ink,
    fontFamily: "Courier",
    fontSize: 13,
    fontWeight: "700",
  },
  serialLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  smallStatusPill: {
    ...commonStyles.neutralPill,
    alignSelf: "flex-start",
  },
  smallStatusPillText: {
    ...commonStyles.neutralPillText,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  ticketCardShell: {
    gap: 14,
    padding: 16,
  },
  ticketFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ticketHeaderRow: {
    ...commonStyles.rowBetweenCenterGap12,
  },
  ticketHeaderText: {
    flex: 1,
    gap: 6,
  },
  ticketTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
  },
});
