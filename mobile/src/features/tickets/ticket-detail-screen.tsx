import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPrice(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function SectionCard({
  title,
  subtitle,
  status,
  expanded,
  onToggle,
  children,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  status?: "attention" | "default" | "saving" | "saved";
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
            {status ? (
              <View
                style={[
                  styles.sectionStatePill,
                  status === "attention" ? styles.sectionStateAttention : null,
                  status === "saving" ? styles.sectionStateSaving : null,
                  status === "saved" ? styles.sectionStateSaved : null,
                ]}
              >
                <Text
                  style={[
                    styles.sectionStatePillText,
                    status === "attention" ? styles.sectionStateAttentionText : null,
                    status === "saving" ? styles.sectionStateSavingText : null,
                    status === "saved" ? styles.sectionStateSavedText : null,
                  ]}
                >
                  {status === "attention"
                    ? "Needs review"
                    : status === "saving"
                      ? "Saving"
                      : status === "saved"
                        ? "Saved"
                        : "Ready"}
                </Text>
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

export function TicketDetailScreen({ serialNumber }: { serialNumber: string }) {
  const { session } = useAuth();
  const { setTicketStatusOverride } = useWalletSync();
  const [showQr, setShowQr] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [resalePrice, setResalePrice] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    qr: true,
    resale: false,
    transfer: false,
  });
  const [activeAction, setActiveAction] = useState<"resale" | "transfer" | null>(null);

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
  const transferIsDirty = Boolean(transferEmail.trim());
  const resaleIsDirty = Boolean(resalePrice.trim());
  const transferIsValid = !transferEmail.trim() || isValidEmail(transferEmail);
  const resaleIsValid = !resalePrice.trim() || isValidPrice(resalePrice);

  const resaleSummary = useMemo(() => {
    if (!ticket?.latestResaleListing) {
      return "Not listed for resale.";
    }

    return `${ticket.latestResaleListing.status} · ${formatMoney(
      ticket.latestResaleListing.askingPrice,
      ticket.latestResaleListing.currency,
    )}`;
  }, [ticket?.latestResaleListing]);
  const stickyAction = useMemo(() => {
    if (expandedSections.transfer && transferIsDirty) {
      return {
        disabled: !canTransfer || !transferIsValid || activeAction === "transfer",
        label: transferIsValid ? "Start transfer" : "Complete transfer details",
        onPress: () =>
          void runAction(
            () =>
              createTransfer(
                serialNumber,
                { recipientEmail: transferEmail.trim() },
                session!.accessToken,
              ),
            "Transfer sent.",
            "transfer",
          ),
        subtitle: "Transfer ready to send",
      };
    }

    if (expandedSections.resale && resaleIsDirty) {
      return {
        disabled: !canResell || !resaleIsValid || activeAction === "resale",
        label: resaleIsValid ? "List for resale" : "Complete resale details",
        onPress: () =>
          void runAction(
            () =>
              createResaleListing(
                serialNumber,
                { askingPrice: resalePrice.trim() },
                session!.accessToken,
              ),
            "Listing created.",
            "resale",
          ),
        subtitle: "Resale draft ready",
      };
    }

    if (transferIsDirty) {
      return {
        disabled: !transferIsValid,
        label: transferIsValid ? "Review transfer" : "Complete transfer details",
        onPress: () => {
          animateLayout();
          setExpandedSections((current) => ({ ...current, transfer: true }));
        },
        subtitle: "Transfer draft in progress",
      };
    }

    if (resaleIsDirty) {
      return {
        disabled: !resaleIsValid,
        label: resaleIsValid ? "Review resale" : "Complete resale details",
        onPress: () => {
          animateLayout();
          setExpandedSections((current) => ({ ...current, resale: true }));
        },
        subtitle: "Resale draft in progress",
      };
    }

    return null;
  }, [
    activeAction,
    canResell,
    canTransfer,
    expandedSections.resale,
    expandedSections.transfer,
    resaleIsDirty,
    resaleIsValid,
    resalePrice,
    serialNumber,
    session,
    transferEmail,
    transferIsDirty,
    transferIsValid,
  ]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timer = setTimeout(() => {
      animateLayout();
      setActionMessage(null);
    }, 2600);

    return () => clearTimeout(timer);
  }, [actionMessage]);

  function applyTicketStatusToWallet(nextStatus: string) {
    setTicketStatusOverride(serialNumber, nextStatus);
  }

  async function runAction(
    action: () => Promise<TransferResponse | ResaleResponse | unknown>,
    successMessage: string,
    actionKey?: "resale" | "transfer",
  ) {
    if (actionKey) {
      setActiveAction(actionKey);
    }

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
      if (actionKey === "transfer") {
        setTransferEmail("");
      }
      if (actionKey === "resale") {
        setResalePrice("");
      }
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      if (actionKey) {
        setActiveAction(null);
      }
    }
  }

  function toggleSection(section: "qr" | "resale" | "transfer") {
    animateLayout();
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <Screen
      title="Ticket detail"
      subtitle="View your ticket, show your QR code, or manage ticket actions."
    >
      <>
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

            <SectionCard
              expanded={expandedSections.qr}
              onToggle={() => toggleSection("qr")}
              status={showQr ? "saved" : "default"}
              subtitle="Open your scan-ready QR only when you need it."
              title="Entry QR"
            >
              {!canShowQr ? (
                <Text style={styles.copy}>
                  This ticket isn't available for entry right now, so the QR code is hidden.
                </Text>
              ) : null}
              {canShowQr && !showQr ? (
                <ActionButton
                  onPress={() => {
                    animateLayout();
                    setShowQr(true);
                  }}
                  title="Show scan-ready QR"
                />
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
            </SectionCard>

            <SectionCard
              expanded={expandedSections.transfer}
              onToggle={() => toggleSection("transfer")}
              status={
                activeAction === "transfer"
                  ? "saving"
                  : transferIsDirty
                    ? "attention"
                    : actionMessage === "Transfer sent."
                      ? "saved"
                      : "default"
              }
              subtitle="Send this ticket to someone else. Ownership only changes after they accept."
              title="Transfer ticket"
            >
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setTransferEmail}
                placeholder="friend@example.com"
                placeholderTextColor={palette.muted}
                style={[styles.input, !transferIsValid && transferIsDirty ? styles.inputError : null]}
                value={transferEmail}
              />
              {!transferIsValid && transferIsDirty ? (
                <Text style={styles.errorText}>Use a valid email address.</Text>
              ) : null}
              <ActionButton
                disabled={!canTransfer || !transferEmail.trim() || !transferIsValid}
                loading={activeAction === "transfer"}
                onPress={() =>
                  void runAction(
                    () =>
                      createTransfer(
                        serialNumber,
                        { recipientEmail: transferEmail.trim() },
                        session!.accessToken,
                      ),
                    "Transfer sent.",
                    "transfer",
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
            </SectionCard>

            <SectionCard
              expanded={expandedSections.resale}
              onToggle={() => toggleSection("resale")}
              status={
                activeAction === "resale"
                  ? "saving"
                  : resaleIsDirty
                    ? "attention"
                    : actionMessage === "Listing created."
                      ? "saved"
                      : "default"
              }
              subtitle={resaleSummary}
              title="Resale listing"
            >
              <TextInput
                keyboardType="numeric"
                onChangeText={setResalePrice}
                placeholder="Price in euros, e.g. 15.00"
                placeholderTextColor={palette.muted}
                style={[styles.input, !resaleIsValid && resaleIsDirty ? styles.inputError : null]}
                value={resalePrice}
              />
              {!resaleIsValid && resaleIsDirty ? (
                <Text style={styles.errorText}>Use a price like 15.00.</Text>
              ) : null}
              <ActionButton
                disabled={!canResell || !resalePrice.trim() || !resaleIsValid}
                loading={activeAction === "resale"}
                onPress={() =>
                  void runAction(
                    () =>
                      createResaleListing(
                        serialNumber,
                        { askingPrice: resalePrice.trim() },
                        session!.accessToken,
                      ),
                    "Listing created.",
                    "resale",
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
            </SectionCard>
          </>
        ) : null}

        {actionMessage ? (
          <Card tone="accent">
            <Text style={styles.copy}>{actionMessage}</Text>
          </Card>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {stickyAction ? (
        <View style={styles.stickyBarShell}>
          <View style={styles.stickyBar}>
            <View style={styles.stickyCopy}>
              <Text style={styles.stickyTitle}>{stickyAction.subtitle}</Text>
              <Text style={styles.stickyHint}>
                {stickyAction.disabled
                  ? "Finish the required fields to continue."
                  : "You can complete this action now."}
              </Text>
            </View>
            <View style={styles.stickyActionWrap}>
              <ActionButton
                disabled={stickyAction.disabled}
                onPress={stickyAction.onPress}
                title={stickyAction.label}
              />
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
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
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
  inputError: {
    borderColor: palette.danger,
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
  sectionStateAttention: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
  },
  sectionStateAttentionText: {
    color: palette.warning,
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
  sectionStateSaved: {
    backgroundColor: palette.successSoft,
    borderColor: "#b8d9ca",
  },
  sectionStateSavedText: {
    color: palette.successDeep,
  },
  sectionStateSaving: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  sectionStateSavingText: {
    color: palette.accentDeep,
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
