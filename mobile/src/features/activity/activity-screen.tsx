import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
import { CollapsibleSection } from "@/components/section-primitives";
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import {
  getInAppPathFromNotification,
  listWalletNotifications,
  markWalletNotificationAsRead,
  type WalletNotification,
} from "@/lib/notifications/notifications-client";
import { getTransferAcceptPath, listIncomingTransfers } from "@/lib/transfers/transfers-client";
import { commonStyles } from "@/styles/common";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function ActivityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
    if (!isNotificationsExpanded && notificationsQuery.hasNextPage) {
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

  async function openNotification(notification: WalletNotification) {
    if (!session?.accessToken) {
      return;
    }

    try {
      if (!notification.readAt) {
        await markWalletNotificationAsRead(notification.id, session.accessToken);
        await queryClient.invalidateQueries({ queryKey: ["wallet-notifications"] });
      }
    } catch {
      // keep navigation resilient even if read sync fails
    }

    const path = getInAppPathFromNotification(notification);

    if (!path) {
      setActivityMessage("Notification opened. No wallet action is required.");
      return;
    }

    router.push(path as never);
  }

  return (
    <Screen
      title="Activity"
      subtitle="Requests and updates."
      compactHeader
    >
      <>
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Live activity</Text>
              <Text style={styles.heroTitle}>Stay on top of your tickets.</Text>
              <Text style={styles.heroCopy}>Requests and updates in one feed.</Text>

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

          <CollapsibleSection
            expanded={isTransfersExpanded}
            onToggle={() => {
              animateLayout();
              setIsTransfersExpanded((current) => !current);
            }}
            statusLabel={transferCount ? `${transferCount} waiting` : "Clear"}
            subtitle="Needs your response."
            title="Transfer requests"
          >
            {transfersQuery.isLoading ? (
              <>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineMd} />
                  <View style={styles.skeletonLineSm} />
                </View>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineMd} />
                  <View style={styles.skeletonLineSm} />
                </View>
              </>
            ) : transfersQuery.data?.length ? (
              transfersQuery.data.map((transfer) => (
                <Pressable
                  key={transfer.id}
                  onPress={() =>
                    router.push(getTransferAcceptPath(transfer.serialNumber) as never)
                  }
                  style={styles.feedCard}
                >
                  <View style={styles.feedHeader}>
                    <Text style={styles.feedTitle}>{transfer.ticketType.name}</Text>
                    <View style={styles.feedPill}>
                      <Text style={styles.feedPillText}>{transfer.status}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.feedBody}>From {transfer.senderEmail}</Text>
                  <Text style={styles.feedMeta}>
                    ⏳ {formatDateTime(transfer.expiresAt)}
                  </Text>
                  <View style={styles.transferActionRow}>
                    <View style={styles.actionPill}>
                      <Text style={styles.actionPillText}>Open transfer</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No transfer requests waiting</Text>
                <Text style={styles.copy}>You're all caught up.</Text>
                <View style={styles.emptyStateActions}>
                  <ActionButton
                    onPress={() => router.push("/(public)" as never)}
                    title="Explore events"
                    variant="secondary"
                  />
                </View>
              </View>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            expanded={isNotificationsExpanded}
            onToggle={() => {
              animateLayout();
              setIsNotificationsExpanded((current) => !current);
            }}
            statusLabel={notificationsQuery.hasNextPage ? "More available" : `${notificationCount} loaded`}
            subtitle="Recent wallet updates."
            title="Notifications"
          >
            {notificationsQuery.isLoading ? (
              <>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineMd} />
                  <View style={styles.skeletonLineSm} />
                </View>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineMd} />
                  <View style={styles.skeletonLineSm} />
                </View>
              </>
            ) : notificationItems.length ? (
              notificationItems.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => void openNotification(notification)}
                  style={styles.feedCard}
                >
                  <View style={styles.feedHeader}>
                    <Text style={styles.feedTitle}>{notification.title}</Text>
                    <View style={styles.feedHeaderPills}>
                      {notification.type === "TRANSFER_RECEIVED" ? (
                        <View style={styles.actionPill}>
                          <Text style={styles.actionPillText}>Open transfer</Text>
                        </View>
                      ) : notification.type === "STAFF_INVITE_RECEIVED" ? (
                        <View style={styles.actionPill}>
                          <Text style={styles.actionPillText}>Open role invite</Text>
                        </View>
                      ) : null}
                      <View style={styles.neutralPill}>
                        <Text style={styles.neutralPillText}>
                          {notification.readAt ? "Read" : "New"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={styles.feedBody}>{notification.body}</Text>
                  <Text style={styles.feedMeta}>🕒 {formatDateTime(notification.createdAt)}</Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.copy}>Purchases, offers, and transfers will show up here.</Text>
                <View style={styles.emptyStateActions}>
                  <ActionButton
                    onPress={async () => {
                      await notificationsQuery.refetch();
                      setActivityMessage("Notifications refreshed.");
                    }}
                    title="Refresh notifications"
                    variant="secondary"
                  />
                </View>
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
          </CollapsibleSection>

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
                <Text style={styles.stickyHint}>Keep moving without scrolling back.</Text>
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
    ...commonStyles.contentContainer,
  },
  copy: {
    ...commonStyles.bodyCopy,
  },
  emptyCard: {
    ...commonStyles.subtleEmptyCard,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyStateActions: {
    marginTop: 12,
  },
  feedBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  feedCard: {
    ...commonStyles.softCard,
  },
  feedHeader: {
    ...commonStyles.rowBetweenCenterGap12,
  },
  feedHeaderPills: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  feedMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  feedPill: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
    ...commonStyles.pillBase,
  },
  feedPillText: {
    color: palette.warning,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  actionPill: {
    backgroundColor: palette.successSoft,
    borderColor: "#bfe8ce",
    ...commonStyles.pillBase,
  },
  actionPillText: {
    color: palette.success,
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
    ...commonStyles.heroDarkEyebrow,
  },
  heroShell: {
    ...commonStyles.heroDarkShell,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
    maxWidth: 320,
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
  neutralPill: {
    ...commonStyles.neutralPill,
  },
  neutralPillText: {
    ...commonStyles.neutralPillText,
  },
  skeletonCard: {
    backgroundColor: "#fff7eb",
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  skeletonLineLg: {
    backgroundColor: "#e9dac7",
    borderRadius: 8,
    height: 17,
    width: "70%",
  },
  skeletonLineMd: {
    backgroundColor: "#eee1d0",
    borderRadius: 8,
    height: 13,
    width: "88%",
  },
  skeletonLineSm: {
    backgroundColor: "#eee1d0",
    borderRadius: 8,
    height: 12,
    width: "52%",
  },
  sectionTitle: {
    ...commonStyles.headingLg,
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
  transferActionRow: {
    alignItems: "flex-start",
    marginTop: 2,
  },
});
