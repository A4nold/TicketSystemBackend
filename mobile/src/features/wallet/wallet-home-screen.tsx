import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { useWalletSync } from "@/components/providers/wallet-sync-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { getTicketStatusMeta, groupTicketsByEvent } from "@/features/wallet/wallet-model";
import { formatDateTime } from "@/lib/formatters";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";
import { listOwnedTickets } from "@/lib/tickets/tickets-client";
import { palette } from "@/styles/theme";

export function WalletHomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { clearTicketStatusOverride, getTicketStatusOverride } = useWalletSync();
  const walletQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listOwnedTickets(session!.accessToken, { sort: "asc" }),
    queryKey: ["owned-tickets", session?.accessToken],
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
            <Text style={styles.heroHeadline}>
              Everything you need for your next event.
            </Text>
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
            <Text style={styles.copy}>
              You don't have any tickets on this account yet.
            </Text>
          </Card>
        ) : null}

        {primaryTicket ? (
          <Card tone="success" padded={false}>
            <View style={styles.primaryTicketShell}>
              <View style={styles.primaryTicketTop}>
                <View style={styles.primaryTicketHeading}>
                  <Text style={styles.eyebrow}>Priority ticket</Text>
                  <Text style={styles.heroTitle}>{primaryTicket.event.title}</Text>
                  <Text style={styles.copy}>
                    {primaryTicket.ticketType.name} · {formatDateTime(primaryTicket.event.startsAt)}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {primaryTicket.status.replaceAll("_", " ")}
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

              <ActionButton
                onPress={() =>
                  router.push({
                    params: { serialNumber: primaryTicket.serialNumber },
                    pathname: "/tickets/[serialNumber]",
                  })
                }
                title="Open ticket"
              />
            </View>
          </Card>
        ) : null}

        {groupedTickets.map((group) => (
          <View key={group.event.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.event.title}</Text>
              <Text style={styles.groupCount}>{group.tickets.length} ticket{group.tickets.length > 1 ? "s" : ""}</Text>
            </View>
            <Text style={styles.groupSubtitle}>{formatDateTime(group.event.startsAt)}</Text>
            {group.tickets.map((ticket) => {
              const meta = getTicketStatusMeta(ticket.status);

              return (
                <Card key={ticket.id} tone={meta.tone === "success" ? "success" : "default"} padded={false}>
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
                        onPress={() =>
                          router.push({
                            params: { serialNumber: ticket.serialNumber },
                            pathname: "/tickets/[serialNumber]",
                          })
                        }
                        title="View detail"
                        variant="secondary"
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
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
  groupCount: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  groupHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  groupSubtitle: {
    color: palette.muted,
    fontSize: 14,
  },
  groupTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "800",
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
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
    maxWidth: 310,
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
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  serial: {
    color: palette.ink,
    fontFamily: "Courier",
    fontSize: 13,
    fontWeight: "600",
  },
  serialLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  smallStatusPill: {
    alignItems: "center",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallStatusPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  primaryTicketHeading: {
    flex: 1,
    gap: 6,
  },
  primaryTicketShell: {
    gap: 16,
    padding: 18,
  },
  primaryTicketTop: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statusPillText: {
    color: palette.successDeep,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  ticketCardShell: {
    gap: 16,
    padding: 18,
  },
  ticketFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ticketHeaderRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  ticketHeaderText: {
    flex: 1,
    gap: 4,
  },
  ticketTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
  },
});
