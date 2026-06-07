import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/formatters";
import { getOrganizerEventBySlug } from "@/lib/organizer/events-client";
import { getOrganizerEventSales } from "@/lib/organizer/sales-client";
import { palette } from "@/styles/theme";

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function OrganizerEventSalesScreen() {
  const { eventId: routeEventId, slug, title } = useLocalSearchParams<{
    eventId?: string;
    slug: string;
    title?: string;
  }>();
  const { session } = useAuth();
  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);

  const eventQuery = useQuery({
    enabled: Boolean(session?.accessToken && slug && !routeEventId && hasSurfaceAccess),
    queryFn: () => getOrganizerEventBySlug(slug, session!.accessToken),
    queryKey: ["organizer-event-detail", slug, session?.accessToken],
  });

  const resolvedEventId = routeEventId ?? eventQuery.data?.id ?? null;
  const resolvedTitle = title ?? eventQuery.data?.title ?? "Sales";

  const salesQuery = useInfiniteQuery({
    enabled: Boolean(session?.accessToken && resolvedEventId && hasSurfaceAccess),
    queryFn: ({ pageParam }) =>
      getOrganizerEventSales(resolvedEventId!, session!.accessToken, {
        cursor: pageParam,
        limit: 20,
      }),
    queryKey: ["organizer-event-sales", resolvedEventId, session?.accessToken],
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const summary = salesQuery.data?.pages[0]?.summary ?? null;
  const ticketTypeBreakdown = salesQuery.data?.pages[0]?.ticketTypeBreakdown ?? [];
  const recentTransactions = salesQuery.data?.pages.flatMap((page) => page.recentTransactions) ?? [];

  return (
    <Screen
      title="Sales"
      subtitle={resolvedTitle}
      compactHeader
    >
      <ScrollView contentContainerStyle={styles.content}>
        {!hasSurfaceAccess ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer access isn't available</Text>
              <Text style={styles.copy}>This account does not have organizer access.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && (eventQuery.isLoading || salesQuery.isLoading) ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading sales</Text>
              <Text style={styles.copy}>Pulling the latest sales activity for this event.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && (eventQuery.isError || salesQuery.isError) ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Sales couldn't be loaded</Text>
              <Text style={styles.copy}>
                {getErrorText(eventQuery.error ?? salesQuery.error, "Try again in a moment.")}
              </Text>
              <ActionButton
                onPress={() => {
                  void eventQuery.refetch();
                  void salesQuery.refetch();
                }}
                title="Retry sales"
              />
            </View>
          </Card>
        ) : null}

        {summary ? (
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Sales snapshot</Text>
              <Text style={styles.heroTitle}>{resolvedTitle}</Text>
              <Text style={styles.heroCopy}>Top-line event sales and recent money movement.</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Tickets sold</Text>
                  <Text style={styles.metricValue}>{summary.ticketsSold}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Gross</Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.grossRevenue, summary.currency)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Fees</Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.platformFees, summary.currency)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Est. earnings</Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.estimatedOrganizerEarnings, summary.currency)}
                  </Text>
                </View>
              </View>
              <Text style={styles.refundCopy}>
                Refunded total: {formatMoney(summary.refundedAmount, summary.currency)}
              </Text>
            </View>
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Ticket type breakdown</Text>
            {ticketTypeBreakdown.length ? (
              ticketTypeBreakdown.map((ticketType) => (
                <View key={ticketType.ticketTypeId} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionTitle}>{ticketType.ticketTypeName}</Text>
                    <Text style={styles.ticketTypeMeta}>{ticketType.quantitySold} sold</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gross</Text>
                    <Text style={styles.infoValue}>
                      {formatMoney(ticketType.grossRevenue, ticketType.currency)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.copy}>No ticket-type sales have been recorded yet.</Text>
            )}
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Recent transactions</Text>
            <Text style={styles.sectionHint}>Showing the latest sales activity for this event.</Text>
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionTitle}>
                      {transaction.ticketCount} ticket{transaction.ticketCount === 1 ? "" : "s"}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>
                        {transaction.status.replaceAll("_", " ")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.transactionMeta}>{formatDateTime(transaction.createdAt)}</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gross</Text>
                    <Text style={styles.infoValue}>
                      {formatMoney(transaction.grossAmount, transaction.currency)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fees</Text>
                    <Text style={styles.infoValue}>
                      {formatMoney(transaction.platformFeeAmount, transaction.currency)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Net</Text>
                    <Text style={styles.infoValue}>
                      {formatMoney(transaction.organizerNetAmount, transaction.currency)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.copy}>No transactions have been recorded for this event yet.</Text>
            )}
            {salesQuery.hasNextPage ? (
              <ActionButton
                loading={salesQuery.isFetchingNextPage}
                onPress={() => void salesQuery.fetchNextPage()}
                title="Load more transactions"
                variant="secondary"
              />
            ) : null}
            {salesQuery.isFetching && !salesQuery.isLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={palette.ink} />
              </View>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  heroCopy: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  heroEyebrow: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroShell: {
    gap: 16,
    padding: 20,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    width: 64,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoValue: {
    color: palette.ink,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2d6c8",
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "47%",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  refundCopy: {
    color: palette.muted,
    fontSize: 14,
  },
  inlineLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  sectionShell: {
    gap: 12,
    padding: 20,
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#f3eadf",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  transactionCard: {
    borderBottomColor: "#eee1d2",
    borderBottomWidth: 1,
    gap: 8,
    paddingBottom: 12,
  },
  transactionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  transactionMeta: {
    color: palette.muted,
    fontSize: 14,
  },
  ticketTypeMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  transactionTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
});
