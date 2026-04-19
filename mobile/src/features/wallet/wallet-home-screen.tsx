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
import { ActionButton, Card, Screen } from "@/components/ui";
import { getTicketStatusMeta, groupTicketsByEvent } from "@/features/wallet/wallet-model";
import { formatDateTime } from "@/lib/formatters";
import { getOrderById } from "@/lib/orders/orders-client";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";
import { listOwnedTickets } from "@/lib/tickets/tickets-client";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function WalletSection({
  title,
  subtitle,
  statusLabel,
  expanded,
  onToggle,
  children,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  statusLabel?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <Card padded={false}>
      <View style={styles.sectionShell}>
        <Pressable onPress={onToggle} style={styles.sectionHeaderButton}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.copy}>{subtitle}</Text>
          </View>
          <View style={styles.sectionHeaderMeta}>
            {statusLabel ? (
              <View style={styles.sectionStatePill}>
                <Text style={styles.sectionStatePillText}>{statusLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionChevron}>{expanded ? "Hide" : "Open"}</Text>
          </View>
        </Pressable>
        {expanded ? children : null}
      </View>
    </Card>
  );
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
      subtitle="Your tickets, ready when you need them."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />
            <Text style={styles.heroEyebrow}>Live wallet</Text>
            <Text style={styles.heroHeadline}>Everything you need for your next event.</Text>
            <Text style={styles.heroCopy}>
              See active tickets first, then keep track of the rest by event.
            </Text>

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
          </View>
        </Card>

        {recentOrderQuery.data ? (
          <Card tone="success">
            <Text style={styles.sectionTitle}>Recent purchase</Text>
            <Text style={styles.copy}>
              {recentOrderQuery.data.event.title} is now linked to your wallet.
              {recentOrderQuery.data.tickets.length > 0
                ? ` ${recentOrderQuery.data.tickets.length} ticket${recentOrderQuery.data.tickets.length === 1 ? "" : "s"} arrived successfully.`
                : " Payment is confirmed and ticket issuance is still finalizing."}
            </Text>
            <View style={styles.purchaseMetaRow}>
              <Text style={styles.purchaseMetaLabel}>Order</Text>
              <Text style={styles.purchaseMetaValue}>{recentOrderQuery.data.id}</Text>
            </View>
            <View style={styles.purchaseMetaRow}>
              <Text style={styles.purchaseMetaLabel}>Total</Text>
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
          <Card>
            <Text style={styles.sectionTitle}>Loading your tickets</Text>
            <Text style={styles.copy}>Fetching the latest ticket status.</Text>
          </Card>
        ) : null}

        {walletQuery.isError ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Wallet needs another try</Text>
            <Text style={styles.copy}>
              We couldn't load your latest ticket status. Please try again.
            </Text>
            <ActionButton onPress={() => void walletQuery.refetch()} title="Retry wallet" />
          </Card>
        ) : null}

        {!walletQuery.isLoading && !walletQuery.isError && !primaryTicket ? (
          <Card>
            <Text style={styles.sectionTitle}>No tickets yet</Text>
            <Text style={styles.copy}>You don't have any tickets on this account yet.</Text>
          </Card>
        ) : null}

        {primaryTicket ? (
          <WalletSection
            expanded={isPriorityExpanded}
            onToggle={() => {
              animateLayout();
              setIsPriorityExpanded((current) => !current);
            }}
            statusLabel={primaryTicket.status.replaceAll("_", " ")}
            subtitle={`${primaryTicket.ticketType.name} · ${formatDateTime(primaryTicket.event.startsAt)}`}
            title="Priority ticket"
          >
            <View style={styles.primaryTicketShell}>
              <View style={styles.primaryTicketTop}>
                <View style={styles.primaryTicketHeading}>
                  <Text style={styles.eyebrow}>Up next</Text>
                  <Text style={styles.heroTitle}>{primaryTicket.event.title}</Text>
                  <Text style={styles.copy}>
                    {getTicketStatusMeta(primaryTicket.status).description}
                  </Text>
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
          </WalletSection>
        ) : null}

        {groupedTickets.map((group) => (
          <WalletSection
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
            subtitle={formatDateTime(group.event.startsAt)}
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
                          <Text style={styles.copy}>{meta.description}</Text>
                        </View>
                        <View style={styles.smallStatusPill}>
                          <Text style={styles.smallStatusPillText}>
                            {ticket.status.replaceAll("_", " ")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ticketFooterRow}>
                        <View>
                          <Text style={styles.serialLabel}>Serial</Text>
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
          </WalletSection>
        ))}
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
  detailLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  detailStrip: {
    flexDirection: "row",
    gap: 12,
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
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
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
    backgroundColor: palette.black,
    gap: 14,
    overflow: "hidden",
    padding: 22,
    position: "relative",
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
  sectionChevron: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionHeaderButton: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sectionHeaderMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionStatePill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionStatePillText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
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
    alignSelf: "flex-start",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallStatusPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
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
