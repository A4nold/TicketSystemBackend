import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { useWalletSync } from "@/components/providers/wallet-sync-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/formatters";
import {
  cancelResaleListing,
  createResaleListing,
  type ResaleResponse,
} from "@/lib/resale/resale-client";
import {
  cancelTransfer,
  createTransfer,
  remindTransfer,
  type TransferResponse,
} from "@/lib/transfers/transfers-client";
import {
  getOwnedTicketBySerialNumber,
  getOwnedTicketQrPayload,
} from "@/lib/tickets/tickets-client";
import { palette } from "@/styles/theme";

export function TicketDetailScreen({ serialNumber }: { serialNumber: string }) {
  const { session } = useAuth();
  const { setTicketStatusOverride } = useWalletSync();
  const [showQr, setShowQr] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [resalePrice, setResalePrice] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const ticketQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => getOwnedTicketBySerialNumber(serialNumber, session!.accessToken),
    queryKey: ["owned-ticket-detail", serialNumber, session?.accessToken],
  });

  const qrQuery = useQuery({
    enabled: Boolean(session?.accessToken && showQr),
    queryFn: () => getOwnedTicketQrPayload(serialNumber, session!.accessToken),
    queryKey: ["owned-ticket-qr", serialNumber, session?.accessToken],
    retry: 1,
  });

  const ticket = ticketQuery.data;
  const canShowQr = ticket?.status === "ISSUED" || ticket?.status === "PAID";
  const canTransfer = canShowQr;
  const canResell = canShowQr;

  const resaleSummary = useMemo(() => {
    if (!ticket?.latestResaleListing) {
      return "Not listed for resale.";
    }

    return `${ticket.latestResaleListing.status} · ${formatMoney(
      ticket.latestResaleListing.askingPrice,
      ticket.latestResaleListing.currency,
    )}`;
  }, [ticket?.latestResaleListing]);

  function applyTicketStatusToWallet(nextStatus: string) {
    setTicketStatusOverride(serialNumber, nextStatus);
  }

  async function runAction(
    action: () => Promise<TransferResponse | ResaleResponse | unknown>,
    successMessage: string,
  ) {
    try {
      const result = await action();

      if (
        result &&
        typeof result === "object" &&
        "ticketStatus" in result &&
        typeof result.ticketStatus === "string"
      ) {
        applyTicketStatusToWallet(result.ticketStatus);
      }

      await ticketQuery.refetch();
      setActionMessage(successMessage);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <Screen
      title="Ticket detail"
      subtitle="View your ticket, show your QR code, or manage ticket actions."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {ticketQuery.isLoading ? (
          <Card>
            <Text style={styles.sectionTitle}>Loading ticket</Text>
            <Text style={styles.copy}>Fetching the latest ticket details.</Text>
          </Card>
        ) : null}

        {ticketQuery.isError ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Ticket unavailable</Text>
            <Text style={styles.copy}>
              We couldn't load this ticket right now. Try again or go back to your wallet.
            </Text>
            <ActionButton onPress={() => void ticketQuery.refetch()} title="Retry ticket" />
          </Card>
        ) : null}

        {ticket ? (
          <>
            <Card tone={canShowQr ? "success" : "warning"} padded={false}>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.heroHeaderCopy}>
                    <Text style={styles.heroEyebrow}>Live ticket</Text>
                    <Text style={styles.sectionTitle}>{ticket.event.title}</Text>
                    <Text style={styles.copy}>
                      {ticket.ticketType.name} · {formatDateTime(ticket.event.startsAt)}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{ticket.status.replaceAll("_", " ")}</Text>
                  </View>
                </View>

                <View style={styles.detailStrip}>
                  <View style={styles.detailTile}>
                    <Text style={styles.detailLabel}>Serial</Text>
                    <Text style={styles.detailValueMono}>{ticket.serialNumber}</Text>
                  </View>
                  <View style={styles.detailTile}>
                    <Text style={styles.detailLabel}>Ownership rev</Text>
                    <Text style={styles.detailValue}>{ticket.ownershipRevision}</Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Entry QR</Text>
              {!canShowQr ? (
                <Text style={styles.copy}>
                  This ticket isn't available for entry right now, so the QR code is hidden.
                </Text>
              ) : null}
              {canShowQr && !showQr ? (
                <ActionButton onPress={() => setShowQr(true)} title="Show scan-ready QR" />
              ) : null}
              {showQr && qrQuery.isLoading ? (
                <Text style={styles.copy}>Preparing your QR code.</Text>
              ) : null}
              {showQr && qrQuery.isError ? (
                <View style={styles.stack}>
                  <Text style={styles.copy}>
                    We couldn't load your QR code. Try again.
                  </Text>
                  <ActionButton onPress={() => void qrQuery.refetch()} title="Retry QR" />
                </View>
              ) : null}
              {showQr && qrQuery.data ? (
                <View style={styles.qrWrap}>
                  <View style={styles.qrCard}>
                    <QRCode size={220} value={qrQuery.data.signedToken} />
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaTile}>
                      <Text style={styles.detailLabel}>Token expires</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(qrQuery.data.expiresAt)}
                      </Text>
                    </View>
                    <View style={styles.metaTile}>
                      <Text style={styles.detailLabel}>Revision</Text>
                      <Text style={styles.detailValue}>{qrQuery.data.ownershipRevision}</Text>
                    </View>
                  </View>
                </View>
              ) : null}
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Transfer ticket</Text>
              <Text style={styles.copy}>
                Send this ticket to someone else. Ownership changes only after they accept.
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setTransferEmail}
                placeholder="recipient@example.com"
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={transferEmail}
              />
              <ActionButton
                disabled={!canTransfer || !transferEmail.trim()}
                onPress={() =>
                  void runAction(
                    () =>
                      createTransfer(
                        serialNumber,
                        { recipientEmail: transferEmail.trim() },
                        session!.accessToken,
                      ),
                    "Transfer sent.",
                  )
                }
                title="Start transfer"
              />
              <ActionButton
                disabled={ticket.latestTransfer?.status !== "PENDING"}
                onPress={() =>
                  void runAction(
                    () => cancelTransfer(serialNumber, session!.accessToken),
                    "Transfer cancelled.",
                  )
                }
                title="Cancel transfer"
                variant="secondary"
              />
              <ActionButton
                disabled={ticket.latestTransfer?.status !== "PENDING"}
                onPress={() =>
                  void runAction(
                    () => remindTransfer(serialNumber, session!.accessToken),
                    "Reminder sent.",
                  )
                }
                title="Send reminder"
                variant="secondary"
              />
              </View>
            </Card>

            <Card padded={false}>
              <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Resale listing</Text>
              <Text style={styles.copy}>{resaleSummary}</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setResalePrice}
                placeholder="Price in minor units, e.g. 2500"
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={resalePrice}
              />
              <ActionButton
                disabled={!canResell || !resalePrice.trim()}
                onPress={() =>
                  void runAction(
                    () =>
                      createResaleListing(
                        serialNumber,
                        { askingPrice: resalePrice.trim() },
                        session!.accessToken,
                      ),
                    "Listing created.",
                  )
                }
                title="List for resale"
              />
              <ActionButton
                disabled={ticket.latestResaleListing?.status !== "LISTED"}
                onPress={() =>
                  void runAction(
                    () => cancelResaleListing(serialNumber, session!.accessToken),
                    "Listing cancelled.",
                  )
                }
                title="Cancel listing"
                variant="secondary"
              />
              </View>
            </Card>
          </>
        ) : null}

        {actionMessage ? (
          <Card tone="accent">
            <Text style={styles.copy}>{actionMessage}</Text>
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
  detailLabel: {
    color: palette.mutedSoft,
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
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  detailValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  detailValueMono: {
    color: palette.ink,
    fontFamily: "Courier",
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    gap: 16,
    padding: 18,
  },
  heroEyebrow: {
    color: palette.successDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  heroHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dfcfbe",
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaTile: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 18,
  },
  qrWrap: {
    gap: 14,
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
  stack: {
    gap: 12,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.85)",
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
});
