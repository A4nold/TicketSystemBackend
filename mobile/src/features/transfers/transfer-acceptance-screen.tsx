import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime } from "@/lib/formatters";
import { ApiError, apiFetch } from "@/lib/api/client";
import { acceptTransfer } from "@/lib/transfers/transfers-client";
import { commonStyles } from "@/styles/common";
import { palette } from "@/styles/theme";

type PublicTicketDetail = {
  event: {
    startsAt: string;
    title: string;
  };
  latestTransfer: {
    acceptedAt: string | null;
    expiresAt: string;
    reminderSentAt: string | null;
    recipientEmail: string | null;
    status: string;
  } | null;
  serialNumber: string;
  status: string;
  ticketType: {
    name: string;
  };
};

function getTransferStateHeading(
  transfer: PublicTicketDetail["latestTransfer"] | undefined,
  ticketStatus: string | undefined,
) {
  if (transfer?.status === "PENDING" && ticketStatus === "TRANSFER_PENDING") {
    return "This ticket is waiting for your acceptance";
  }

  if (transfer?.status === "ACCEPTED") {
    return "This transfer is already completed";
  }

  if (transfer?.status === "CANCELLED") {
    return "This transfer is no longer active";
  }

  if (transfer?.status === "EXPIRED") {
    return "This transfer expired before acceptance";
  }

  return "This transfer is unavailable right now";
}

function getUnavailableTransferMessage(
  transfer: PublicTicketDetail["latestTransfer"] | undefined,
  ticketStatus: string | undefined,
) {
  if (transfer?.status === "CANCELLED") {
    return "The sender cancelled this transfer before it was accepted.";
  }

  if (transfer?.status === "ACCEPTED") {
    return "This transfer has already been accepted.";
  }

  if (transfer?.status === "EXPIRED") {
    return "This transfer expired before acceptance was completed.";
  }

  if (ticketStatus === "ISSUED" || ticketStatus === "PAID") {
    return "This ticket is no longer in transfer-pending state.";
  }

  return "This transfer cannot be accepted in its current state.";
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Transfer could not be accepted right now. Please try again.";
}

async function getTransferTicketContext(serialNumber: string) {
  return apiFetch<PublicTicketDetail>(`/api/tickets/${serialNumber}`);
}

export function TransferAcceptanceScreen({ serialNumber }: { serialNumber: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const ticketQuery = useQuery({
    queryFn: () => getTransferTicketContext(serialNumber),
    queryKey: ["transfer-accept-ticket", serialNumber],
    retry: 1,
  });

  const ticket = ticketQuery.data;
  const transfer = ticket?.latestTransfer;
  const transferExpired =
    transfer?.status === "EXPIRED" ||
    (transfer?.status === "PENDING" && new Date(transfer.expiresAt) < new Date());
  const canAttemptAcceptance =
    transfer?.status === "PENDING" &&
    ticket?.status === "TRANSFER_PENDING" &&
    !transferExpired;
  const unavailableMessage = useMemo(
    () => getUnavailableTransferMessage(transfer, ticket?.status),
    [ticket?.status, transfer],
  );

  async function handleAccept() {
    if (!session?.accessToken) {
      setActionError("Sign in to accept this ticket transfer.");
      return;
    }

    setIsAccepting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const accepted = await acceptTransfer(serialNumber, session.accessToken);
      setActionSuccess(`Transfer accepted. Ticket ${accepted.serialNumber} is now in your wallet.`);
      await Promise.all([
        ticketQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["owned-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["incoming-transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-notifications"] }),
      ]);
      router.replace("/wallet");
      router.push({
        pathname: "/tickets/[serialNumber]",
        params: {
          serialNumber: accepted.serialNumber,
        },
      });
    } catch (error) {
      setActionError(getErrorText(error));
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <Screen
      title="Transfer acceptance"
      subtitle="Review transfer details before moving ownership into your wallet."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {ticketQuery.isLoading || ticketQuery.isFetching ? (
          <Card>
            <Text style={styles.sectionTitle}>Loading transfer context</Text>
            <Text style={styles.copy}>Fetching the latest transfer and ticket state.</Text>
          </Card>
        ) : null}

        {ticketQuery.isError ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Transfer lookup needs another try</Text>
            <Text style={styles.copy}>We could not load transfer details right now.</Text>
            <ActionButton onPress={() => void ticketQuery.refetch()} title="Retry" />
          </Card>
        ) : null}

        {ticket ? (
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Transfer review</Text>
              <Text style={styles.heroTitle}>
                {getTransferStateHeading(transfer, ticket.status)}
              </Text>
              <Text style={styles.heroEventTitle}>{ticket.event.title}</Text>
              <Text style={styles.heroCopy}>
                {ticket.ticketType.name} · {formatDateTime(ticket.event.startsAt)}
              </Text>

              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Serial</Text>
                  <Text style={styles.metricValue}>{ticket.serialNumber}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Transfer</Text>
                  <Text style={styles.metricValue}>
                    {transfer ? transfer.status.replaceAll("_", " ") : "Unavailable"}
                  </Text>
                </View>
              </View>

              {transfer?.expiresAt ? (
                <Text style={styles.heroMeta}>
                  Expires {formatDateTime(transfer.expiresAt)}
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

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

        {ticket ? (
          canAttemptAcceptance ? (
            <View style={styles.primaryActionWrap}>
              <ActionButton
                loading={isAccepting}
                onPress={() => void handleAccept()}
                title="Accept ticket"
              />
            </View>
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>Transfer unavailable</Text>
              <Text style={styles.copy}>{unavailableMessage}</Text>
              <ActionButton
                onPress={() => router.replace("/wallet")}
                title="Return to wallet"
                variant="secondary"
              />
            </Card>
          )
        ) : null}
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
  heroCopy: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  heroEventTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  heroEyebrow: {
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  heroShell: {
    gap: 12,
    padding: 18,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 26,
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
  primaryActionWrap: {
    marginTop: -4,
  },
  sectionTitle: {
    ...commonStyles.headingMd,
  },
});
