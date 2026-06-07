import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/formatters";
import { getOrganizerTicketIssueDetail } from "@/lib/organizer/organizer-ticket-issue-client";
import { palette } from "@/styles/theme";

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatPersonName(input: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();

  return fullName || input.email;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function OrganizerTicketIssueScreen() {
  const { eventId, serialNumber } = useLocalSearchParams<{
    eventId: string;
    serialNumber: string;
  }>();
  const { session } = useAuth();
  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);
  const ticketQuery = useQuery({
    enabled: Boolean(session?.accessToken && eventId && serialNumber && hasSurfaceAccess),
    queryFn: () =>
      getOrganizerTicketIssueDetail(eventId, serialNumber, session!.accessToken),
    queryKey: ["organizer-ticket-issue", eventId, serialNumber, session?.accessToken],
  });

  const ticket = ticketQuery.data;

  return (
    <Screen
      title="Attendee detail"
      subtitle={serialNumber}
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

        {hasSurfaceAccess && ticketQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading attendee ticket</Text>
              <Text style={styles.copy}>Checking the latest ticket state.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && ticketQuery.isError ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Ticket detail couldn't be loaded</Text>
              <Text style={styles.copy}>
                {getErrorText(ticketQuery.error, "Try again in a moment.")}
              </Text>
              <ActionButton onPress={() => void ticketQuery.refetch()} title="Retry detail" />
            </View>
          </Card>
        ) : null}

        {ticket ? (
          <>
            <Card tone="accent" padded={false}>
              <View style={styles.heroShell}>
                <Text style={styles.heroEyebrow}>Ticket issue detail</Text>
                <Text style={styles.heroTitle}>{formatPersonName(ticket.currentOwner)}</Text>
                <Text style={styles.heroCopy}>{ticket.currentOwner.email}</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Status</Text>
                    <Text style={styles.metricValue}>{ticket.status.replaceAll("_", " ")}</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Scans</Text>
                    <Text style={styles.metricValue}>{ticket.scanSummary.totalAttempts}</Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
                <Text style={styles.sectionTitle}>Ticket</Text>
                <InfoRow label="Type" value={ticket.ticketType.name} />
                <InfoRow label="Serial" value={ticket.serialNumber} />
                <InfoRow
                  label="Issued"
                  value={ticket.issuedAt ? formatDateTime(ticket.issuedAt) : "Not issued yet"}
                />
                <InfoRow
                  label="Checked in"
                  value={ticket.usedAt ? formatDateTime(ticket.usedAt) : "Not checked in yet"}
                />
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
                <Text style={styles.sectionTitle}>Current holder</Text>
                <InfoRow label="Name" value={formatPersonName(ticket.currentOwner)} />
                <InfoRow label="Email" value={ticket.currentOwner.email} />
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
                <Text style={styles.sectionTitle}>Recent scan activity</Text>
                {ticket.scanAttempts.length ? (
                  ticket.scanAttempts.slice(0, 5).map((attempt, index) => (
                    <View key={`${attempt.scannedAt}-${index}`} style={styles.timelineItem}>
                      <Text style={styles.timelineTitle}>
                        {attempt.outcome.replaceAll("_", " ")}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        {formatDateTime(attempt.scannedAt)}
                        {attempt.deviceLabel ? ` · ${attempt.deviceLabel}` : ""}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.copy}>No scan attempts recorded yet.</Text>
                )}
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
                <Text style={styles.sectionTitle}>Ownership history</Text>
                {ticket.ownershipHistory.length ? (
                  ticket.ownershipHistory.map((entry) => (
                    <View key={`${entry.revision}-${entry.createdAt}`} style={styles.timelineItem}>
                      <Text style={styles.timelineTitle}>
                        Rev {entry.revision} · {entry.changeType.replaceAll("_", " ")}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        {entry.fromEmail ?? "Unknown"} → {entry.toEmail ?? "Unknown"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.copy}>No ownership changes recorded yet.</Text>
                )}
              </View>
            </Card>
          </>
        ) : null}
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
    width: 92,
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
    flex: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionShell: {
    gap: 12,
    padding: 20,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  timelineItem: {
    borderBottomColor: "#eee1d2",
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10,
  },
  timelineMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  timelineTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
});
