import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import { listWalletNotifications } from "@/lib/notifications/notifications-client";
import { listIncomingTransfers } from "@/lib/transfers/transfers-client";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function ActivitySection({
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

export function ActivityScreen() {
  const { session } = useAuth();
  const [isTransfersExpanded, setIsTransfersExpanded] = useState(true);
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(true);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const notificationsQuery = useInfiniteQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: ({ pageParam }) =>
      listWalletNotifications(session!.accessToken, {
        cursor: pageParam,
        limit: 10,
      }),
    queryKey: ["wallet-notifications", session?.accessToken],
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
  const transfersQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listIncomingTransfers(session!.accessToken),
    queryKey: ["incoming-transfers", session?.accessToken],
  });

  const notificationItems =
    notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const notificationCount = notificationItems.length;
  const transferCount = transfersQuery.data?.length ?? 0;
  const stickyAction = useMemo(() => {
    if (isNotificationsExpanded && notificationsQuery.hasNextPage) {
      return {
        label: notificationsQuery.isFetchingNextPage
          ? "Loading more"
          : "Load older notifications",
        onPress: async () => {
          await notificationsQuery.fetchNextPage();
          setActivityMessage("Older notifications loaded.");
        },
      };
    }

    if (!isTransfersExpanded && transferCount > 0) {
      return {
        label: `Open ${transferCount} pending request${transferCount > 1 ? "s" : ""}`,
        onPress: () => {
          animateLayout();
          setIsTransfersExpanded(true);
        },
      };
    }

    return null;
  }, [isNotificationsExpanded, isTransfersExpanded, notificationsQuery, transferCount]);

  useEffect(() => {
    if (!activityMessage) {
      return;
    }

    const timer = setTimeout(() => {
      animateLayout();
      setActivityMessage(null);
    }, 2400);

    return () => clearTimeout(timer);
  }, [activityMessage]);

  return (
    <Screen
      title="Activity"
      subtitle="Updates, requests, and account activity."
    >
      <>
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Live activity</Text>
              <Text style={styles.heroTitle}>
                Stay on top of what's happening with your tickets.
              </Text>
              <Text style={styles.heroCopy}>
                Review transfer requests and important updates in one place.
              </Text>

              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Requests waiting</Text>
                  <Text style={styles.metricValue}>{transferCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Recent updates</Text>
                  <Text style={styles.metricValue}>{notificationCount}</Text>
                </View>
              </View>
            </View>
          </Card>

          <ActivitySection
            expanded={isTransfersExpanded}
            onToggle={() => {
              animateLayout();
              setIsTransfersExpanded((current) => !current);
            }}
            statusLabel={transferCount ? `${transferCount} waiting` : "Clear"}
            subtitle="Requests that still need your response."
            title="Transfer requests"
          >
            {transfersQuery.data?.length ? (
              transfersQuery.data.map((transfer) => (
                <View key={transfer.id} style={styles.feedCard}>
                  <View style={styles.feedHeader}>
                    <Text style={styles.feedTitle}>{transfer.ticketType.name}</Text>
                    <View style={styles.feedPill}>
                      <Text style={styles.feedPillText}>{transfer.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.feedBody}>From {transfer.senderEmail}</Text>
                  <Text style={styles.feedMeta}>
                    Expires {formatDateTime(transfer.expiresAt)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending incoming transfers</Text>
                <Text style={styles.copy}>You're all caught up.</Text>
              </View>
            )}
          </ActivitySection>

          <ActivitySection
            expanded={isNotificationsExpanded}
            onToggle={() => {
              animateLayout();
              setIsNotificationsExpanded((current) => !current);
            }}
            statusLabel={notificationsQuery.hasNextPage ? "More available" : `${notificationCount} loaded`}
            subtitle="Recent updates from your wallet activity."
            title="Notifications"
          >
            {notificationItems.length ? (
              notificationItems.map((notification) => (
                <View key={notification.id} style={styles.feedCard}>
                  <View style={styles.feedHeader}>
                    <Text style={styles.feedTitle}>{notification.title}</Text>
                    <View style={styles.neutralPill}>
                      <Text style={styles.neutralPillText}>
                        {notification.readAt ? "Read" : "New"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedBody}>{notification.body}</Text>
                  <Text style={styles.feedMeta}>{formatDateTime(notification.createdAt)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No wallet notifications yet</Text>
                <Text style={styles.copy}>New activity will appear here.</Text>
              </View>
            )}

            {notificationsQuery.hasNextPage ? (
              <ActionButton
                loading={notificationsQuery.isFetchingNextPage}
                onPress={async () => {
                  await notificationsQuery.fetchNextPage();
                  setActivityMessage("Older notifications loaded.");
                }}
                title="Load older notifications"
                variant="secondary"
              />
            ) : null}
          </ActivitySection>

          {activityMessage ? (
            <Card tone="success">
              <Text style={styles.copy}>{activityMessage}</Text>
            </Card>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {stickyAction ? (
          <View style={styles.stickyBarShell}>
            <View style={styles.stickyBar}>
              <View style={styles.stickyCopy}>
                <Text style={styles.stickyTitle}>Activity quick action</Text>
                <Text style={styles.stickyHint}>
                  Keep moving without jumping back through the feed.
                </Text>
              </View>
              <View style={styles.stickyActionWrap}>
                <ActionButton onPress={() => void stickyAction.onPress()} title={stickyAction.label} />
              </View>
            </View>
          </View>
        ) : null}
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomSpacer: {
    height: 100,
  },
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
  emptyCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  feedBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  feedCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  feedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  feedMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  feedPill: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  feedPillText: {
    color: palette.warning,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  feedTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 310,
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
  metricValue: {
    color: palette.white,
    fontSize: 30,
    fontWeight: "800",
  },
  neutralPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  neutralPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
  stickyActionWrap: {
    minWidth: 180,
  },
  stickyBar: {
    backgroundColor: palette.glass,
    borderColor: palette.divider,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    shadowColor: palette.black,
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  stickyBarShell: {
    backgroundColor: "transparent",
    bottom: 12,
    left: 16,
    position: "absolute",
    right: 16,
  },
  stickyCopy: {
    gap: 4,
  },
  stickyHint: {
    color: palette.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  stickyTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
});
