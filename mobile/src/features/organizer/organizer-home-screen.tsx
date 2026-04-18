import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { canManageOrganizerEvents, hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { formatDateTime } from "@/lib/formatters";
import {
  getOrganizerManageableEventIds,
  listOrganizerEvents,
} from "@/lib/organizer/events-client";
import { palette } from "@/styles/theme";

export function OrganizerHomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);
  const manageableEventIds = getOrganizerManageableEventIds(session?.user.memberships ?? []);
  const eventsQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => listOrganizerEvents(session!.accessToken),
    queryKey: ["organizer-events", session?.accessToken],
  });

  const manageableEvents = (eventsQuery.data ?? []).filter((event) =>
    manageableEventIds.includes(event.id),
  );

  return (
    <Screen
      title="Organizer"
      subtitle="Your event operations space for quick updates, ticket controls, and staff access."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Organizer tools</Text>
            <Text style={styles.heroTitle}>Keep event operations moving.</Text>
            <Text style={styles.heroCopy}>
              Jump into any event you manage, make the important changes, and get back out fast.
            </Text>

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
                Organizer access is active, but there are no accepted owner or admin memberships to
                manage yet.
              </Text>
            </View>
          </Card>
        ) : null}

        {manageableEvents.length ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Your events</Text>
              <Text style={styles.copy}>
                Open an event to update essentials, sales setup, and team access.
              </Text>

              {manageableEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{event.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventMeta}>{formatDateTime(event.startsAt)}</Text>
                  <View style={styles.metaStrip}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>
                        {event.ticketTypes.length} ticket type{event.ticketTypes.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {event.venueName ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{event.venueName}</Text>
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
    gap: 10,
    padding: 14,
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
    fontSize: 22,
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
