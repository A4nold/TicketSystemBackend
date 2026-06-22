import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { formatDateTime, getCurrencyLocale } from "@/lib/formatters";
import {
  getOrderByCheckoutSessionId,
  getOrderById,
  getOrderByPaymentIntentId,
} from "@/lib/orders/orders-client";
import { palette } from "@/styles/theme";
import { getCheckoutReturnFailureHeading } from "./checkout-return-heading";
import { readCheckoutReturnIds } from "./checkout-return-params";
import { getCheckoutReturnRefreshLabel } from "./checkout-return-refresh";
import { getCheckoutRecoverySummary } from "./checkout-return-recovery";
import { getCheckoutReturnScreenChrome } from "./checkout-return-screen-chrome";
import {
  getCheckoutReturnCheckoutStatusLabel,
  getCheckoutReturnPaymentStatusLabel,
} from "./checkout-return-status";
import { getCheckoutReturnFailureCopy } from "./checkout-return-state";
import { getCheckoutReturnSupportBody } from "./checkout-return-support-body";
import { getCheckoutReturnSupportSubject } from "./checkout-return-support";

export function CheckoutReturnScreen({ mode }: { mode: "cancel" | "success" }) {
  const params = useLocalSearchParams<{
    reference?: string;
    orderId?: string;
    payment_intent?: string;
    session_id?: string;
    trxref?: string;
  }>();
  const { session } = useAuth();
  const { checkoutSessionId, orderId, paymentIntentId } = readCheckoutReturnIds(params);

  const orderQuery = useQuery({
    enabled: Boolean(session?.accessToken && (orderId || checkoutSessionId || paymentIntentId)),
    queryFn: () =>
      orderId
        ? getOrderById(orderId, session!.accessToken)
        : checkoutSessionId
          ? getOrderByCheckoutSessionId(checkoutSessionId, session!.accessToken)
          : getOrderByPaymentIntentId(paymentIntentId!, session!.accessToken),
    queryKey: [
      "mobile-checkout-return-order",
      orderId,
      checkoutSessionId,
      paymentIntentId,
      session?.accessToken,
      mode,
    ],
    refetchInterval: (query) => {
      const order = query.state.data;

      if (!order) {
        return mode === "success" ? 3_000 : false;
      }

      if (order.status === "PAID" || order.status === "CANCELLED") {
        return false;
      }

      return order.isAwaitingPaymentConfirmation || order.status === "PENDING"
        ? 3_000
        : false;
    },
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
  });

  const order = orderQuery.data;
  const isSuccess = order?.status === "PAID";
  const isPending = order?.status === "PENDING" || order?.isAwaitingPaymentConfirmation === true;
  const isCancelled = order?.status === "CANCELLED";
  const recoverySummary = getCheckoutRecoverySummary({
    checkoutSessionId: checkoutSessionId ?? undefined,
    paymentIntentId: paymentIntentId ?? undefined,
  });
  const failureHeading = getCheckoutReturnFailureHeading({
    hasRecoveryIdentifier: Boolean(recoverySummary),
    isLookupError: orderQuery.isError,
    mode,
    status: order?.status ?? null,
  });
  const screenChrome = getCheckoutReturnScreenChrome({
    hasRecoveryIdentifier: Boolean(recoverySummary),
    isLookupError: orderQuery.isError,
    mode,
    signedIn: Boolean(session),
    status: order?.status ?? null,
  });
  const formatCurrency = (value: string, currency: string) =>
    new Intl.NumberFormat(getCurrencyLocale(currency), {
      currency,
      style: "currency",
    }).format(Number(value));
  const orderTotalLabel = order
    ? formatCurrency(order.totalAmount, order.currency)
    : null;

  return (
    <Screen title={screenChrome.title} subtitle={screenChrome.subtitle}>
      <ScrollView contentContainerStyle={styles.content}>
        {orderQuery.isLoading ? (
          <Card>
            <Text style={styles.sectionTitle}>Refreshing order state</Text>
            <Text style={styles.copy}>
              We are checking your backend order before bringing you back into the app.
            </Text>
          </Card>
        ) : null}

        {!session ? (
          <>
            <Card tone="warning">
              <Text style={styles.sectionTitle}>Sign in required</Text>
              <Text style={styles.copy}>
                Sign in again to reconnect this checkout result with your attendee wallet.
              </Text>
              <Link href="/(auth)/login" style={styles.primaryLink}>
                Go to sign in
              </Link>
            </Card>
            <SupportCard
              body={getCheckoutReturnSupportBody({
                mode,
                orderId,
                recoveryLabel: recoverySummary?.label ?? null,
                recoveryValue: recoverySummary?.value ?? null,
                signedOut: true,
              })}
              subject={getCheckoutReturnSupportSubject({
                orderId,
                recoveryLabel: recoverySummary?.label ?? null,
                recoveryValue: recoverySummary?.value ?? null,
                signedOut: true,
              })}
              title="Still not seeing this purchase in the app?"
            />
          </>
        ) : null}

        {!orderQuery.isLoading && session && isSuccess && order ? (
          <>
            <Card tone="success" padded={false}>
              <View style={styles.heroShell}>
                <Text style={styles.heroEyebrow}>Payment confirmed</Text>
                <Text style={styles.heroTitle}>Your purchase is in motion.</Text>
                <Text style={styles.heroCopy}>
                  {order.tickets.length > 0
                    ? "Your tickets are already in the app and ready for the next step."
                    : "Payment succeeded. Ticket issuance is still finalizing in the background."}
                </Text>
              </View>
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Receipt summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Event</Text>
                <Text style={styles.summaryValue}>{order.event.title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>When</Text>
                <Text style={styles.summaryValue}>{formatDateTime(order.event.startsAt)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order</Text>
                <Text style={styles.summaryMono}>{order.id}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{orderTotalLabel}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment</Text>
                <Text style={styles.summaryValue}>
                  {getCheckoutReturnPaymentStatusLabel(order.paymentStatus)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stack}>
                {order.items.map((item) => (
                  <View key={item.ticketTypeId} style={styles.lineItem}>
                    <View style={styles.lineItemCopy}>
                      <Text style={styles.lineItemTitle}>{item.ticketTypeName}</Text>
                      <Text style={styles.copy}>
                        {item.quantity} ticket{item.quantity === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Text style={styles.lineItemPrice}>
                      {formatCurrency(item.totalPrice, item.currency)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.ctaStack}>
                <Link
                  href={{
                    pathname: "/(tabs)/wallet",
                    params: { recentOrderId: order.id },
                  }}
                  style={styles.primaryLink}
                >
                  Continue to wallet
                </Link>
                <ActionButton
                  loading={orderQuery.isFetching}
                  onPress={() => void orderQuery.refetch()}
                  title={getCheckoutReturnRefreshLabel({
                    isFetching: orderQuery.isFetching,
                    kind: "order",
                  })}
                  variant="secondary"
                />
              </View>
            </Card>
          </>
        ) : null}

        {!orderQuery.isLoading && session && !isSuccess && isPending && order ? (
          <>
            <Card tone="warning" padded={false}>
              <View style={styles.warningShell}>
                <Text style={styles.heroEyebrow}>Still confirming</Text>
                <Text style={styles.sectionTitle}>Payment is still being finalized.</Text>
                <Text style={styles.copy}>
                  We found order {order.id}, but the backend is still checking the latest payment state.
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order total</Text>
                  <Text style={styles.summaryValue}>{orderTotalLabel}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Checkout state</Text>
                  <Text style={styles.summaryValue}>
                    {getCheckoutReturnCheckoutStatusLabel(order.checkoutStatus)}
                  </Text>
                </View>
                <View style={styles.ctaStack}>
                  <Text style={styles.helperCopy}>
                    Maya is rechecking this order every few seconds while this screen stays open.
                  </Text>
                  <ActionButton
                    loading={orderQuery.isFetching}
                    onPress={() => void orderQuery.refetch()}
                    title={getCheckoutReturnRefreshLabel({
                      isFetching: orderQuery.isFetching,
                      kind: "payment",
                    })}
                  />
                  <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
                    Back to wallet
                  </Link>
                </View>
              </View>
            </Card>
            <SupportCard
              body={getCheckoutReturnSupportBody({
                mode,
                orderId: order.id,
              })}
              subject={getCheckoutReturnSupportSubject({ orderId: order.id })}
              title="Need help with this order?"
            />
          </>
        ) : null}

        {!orderQuery.isLoading && session && !isSuccess && (isCancelled || mode === "cancel" || !order) ? (
          <>
            <Card padded={false}>
              <View style={styles.cancelShell}>
                <Text style={styles.heroEyebrow}>{failureHeading.eyebrow}</Text>
                <Text style={styles.sectionTitle}>{failureHeading.title}</Text>
                <Text style={styles.copy}>
                  {getCheckoutReturnFailureCopy({
                    hasRecoveryIdentifier: Boolean(recoverySummary),
                    isLookupError: orderQuery.isError,
                    mode,
                    status: order?.status ?? null,
                  })}
                </Text>
                {recoverySummary && !order ? (
                  <Text style={styles.helperCopy}>
                    {recoverySummary.label}: {recoverySummary.value}
                  </Text>
                ) : null}
                <View style={styles.ctaStack}>
                  {recoverySummary ? (
                    <ActionButton
                      loading={orderQuery.isFetching}
                      onPress={() => void orderQuery.refetch()}
                      title={getCheckoutReturnRefreshLabel({
                        isFetching: orderQuery.isFetching,
                        kind: "payment",
                      })}
                    />
                  ) : null}
                  <Link href="/(public)" style={styles.primaryLink}>
                    Back to discovery
                  </Link>
                  <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
                    Return to wallet
                  </Link>
                </View>
              </View>
            </Card>
            <SupportCard
              body={getCheckoutReturnSupportBody({
                mode,
                orderId,
                recoveryLabel: recoverySummary?.label ?? null,
                recoveryValue: recoverySummary?.value ?? null,
              })}
              subject={getCheckoutReturnSupportSubject({
                orderId,
                recoveryLabel: recoverySummary?.label ?? null,
                recoveryValue: recoverySummary?.value ?? null,
              })}
              title="Charge seen, but nothing in your wallet?"
            />
          </>
        ) : null}

        {!orderQuery.isLoading && session && order ? (
          <Card>
            <Text style={styles.sectionTitle}>What happens next</Text>
            <Text style={styles.copy}>
              Paid orders move into your wallet automatically. If ticket issuance or payment confirmation takes a moment, use refresh before assuming anything is missing.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelShell: {
    gap: 12,
    padding: 18,
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
  ctaStack: {
    gap: 12,
  },
  divider: {
    backgroundColor: palette.divider,
    height: 1,
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.92,
  },
  heroEyebrow: {
    color: "#e8f0ea",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroShell: {
    backgroundColor: palette.successDeep,
    gap: 12,
    padding: 20,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 33,
  },
  helperCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  lineItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lineItemCopy: {
    flex: 1,
    gap: 4,
  },
  lineItemPrice: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  lineItemTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryLink: {
    color: palette.accentDeep,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryLink: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
  summaryLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  summaryMono: {
    color: palette.ink,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    fontWeight: "600",
    maxWidth: "60%",
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  warningShell: {
    gap: 12,
    padding: 18,
  },
});
