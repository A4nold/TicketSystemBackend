import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import { ApiError } from "@/lib/api/client";
import {
  acceptOrganizerStaffInvite,
  listOrganizerEvents,
} from "@/lib/organizer/events-client";
import { commonStyles } from "@/styles/common";
import { palette } from "@/styles/theme";

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Invite could not be accepted right now. Please try again.";
}

export function StaffInviteAcceptanceScreen({ eventId }: { eventId: string }) {
  const { session, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const eventQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listOrganizerEvents(session!.accessToken),
    queryKey: ["organizer-events", session?.accessToken],
    retry: 1,
  });

  const inviteMembership = session?.user.memberships.find(
    (membership) => membership.eventId === eventId && !membership.acceptedAt,
  );
  const invitedRole = inviteMembership?.role;
  const eventTitle = eventQuery.data?.find((event) => event.id === eventId)?.title ?? "Event access invitation";
  const eventStartsAt = eventQuery.data?.find((event) => event.id === eventId)?.startsAt ?? null;

  async function handleAcceptInvite() {
    if (!session?.accessToken) {
      setActionError("Sign in to accept this role invitation.");
      return;
    }

    setIsAccepting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await acceptOrganizerStaffInvite(eventId, session.accessToken);
      await refreshSession();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["organizer-events", session.accessToken] }),
      ]);
      setActionSuccess("Role invitation accepted. Access has been updated.");
      router.replace("/activity");
    } catch (error) {
      setActionError(getErrorText(error));
    } finally {
      setIsAccepting(false);
    }
  }

  const canAccept = Boolean(inviteMembership && invitedRole);

  return (
    <Screen
      title="Role invitation"
      subtitle="Review event access details before accepting this role invitation."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Staff access</Text>
            <Text style={styles.heroTitle}>You were invited to join event operations</Text>
            <Text style={styles.heroEventTitle}>{eventTitle}</Text>
            {eventStartsAt ? (
              <Text style={styles.heroMeta}>Starts {formatDateTime(eventStartsAt)}</Text>
            ) : null}

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Invited role</Text>
                <Text style={styles.metricValue}>{invitedRole ?? "Unavailable"}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text style={styles.metricValue}>{canAccept ? "Pending" : "Resolved"}</Text>
              </View>
            </View>
          </View>
        </Card>

        {actionError ? (
          <Card tone="warning">
            <Text style={styles.copy}>{actionError}</Text>
          </Card>
        ) : null}

        {actionSuccess ? (
          <Card tone="success">
            <Text style={styles.copy}>{actionSuccess}</Text>
          </Card>
        ) : null}

        {canAccept ? (
          <ActionButton
            loading={isAccepting}
            onPress={() => void handleAcceptInvite()}
            title="Accept role invite"
          />
        ) : (
          <Card>
            <Text style={styles.sectionTitle}>Invite unavailable</Text>
            <Text style={styles.copy}>This invitation has already been accepted or is no longer available.</Text>
            <ActionButton onPress={() => router.replace("/activity")} title="Return to activity" variant="secondary" />
          </Card>
        )}
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
  heroEyebrow: {
    ...commonStyles.heroDarkEyebrow,
    color: palette.accentDeep,
  },
  heroEventTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  heroMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  heroShell: {
    ...commonStyles.sectionShell,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  metricCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    ...commonStyles.headingMd,
  },
});
