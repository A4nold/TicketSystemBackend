import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { getOrderById } from "@/lib/orders/orders-client";
import { formatDateTime } from "@/lib/formatters";
import { palette } from "@/styles/theme";

export function CheckoutReturnScreen({ mode }: { mode: "cancel" | "success" }) {
  const params = useLocalSearchParams<{
    orderId?: string;
    session_id?: string;
  }>();
  const { session } = useAuth();
  const orderId = typeof params.orderId === "string" ? params.orderId : undefined;

  const orderQuery = useQuery({
    enabled: Boolean(session?.accessToken && orderId),
    queryFn: () => getOrderById(orderId!, session!.accessToken),
    queryKey: ["mobile-checkout-return-order", orderId, session?.accessToken, mode],
    retry: 1,
  });

  const order = orderQuery.data;
  const isSuccess = order?.status === "PAID";
  const isPending = order?.status === "PENDING" || order?.isAwaitingPaymentConfirmation === true;
  const isCancelled = order?.status === "CANCELLED";
  const orderTotalLabel = order
    ? new Intl.NumberFormat("en-IE", {
        currency: order.currency,
        style: "currency",
      }).format(Number(order.totalAmount))
    : null;

  return (
    <Screen
      title={mode === "success" ? "Checking payment" : "Checkout not completed"}
      subtitle={
        mode === "success"
          ? "We are confirming the latest backend order state for this payment attempt."
          : "We are checking whether this checkout was cancelled or still needs confirmation."
      }
    >
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
              body="If you cannot reconnect this checkout result after signing in again, contact support with any order or payment reference you have."
              subject="TicketSystem checkout return sign-in help"
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
                <Text style={styles.summaryValue}>{order.paymentStatus ?? "paid"}</Text>
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
                      {new Intl.NumberFormat("en-IE", {
                        currency: item.currency,
                        style: "currency",
                      }).format(Number(item.totalPrice))}
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
                  onPress={() => void orderQuery.refetch()}
                  title="Refresh order state"
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
                  <Text style={styles.summaryValue}>{order.checkoutStatus ?? "unknown"}</Text>
                </View>
                <View style={styles.ctaStack}>
                  <ActionButton onPress={() => void orderQuery.refetch()} title="Refresh payment status" />
                  <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
                    Back to wallet
                  </Link>
                </View>
              </View>
            </Card>
            <SupportCard
              body={`If payment remains pending and the wallet still does not update, contact support with order ${order.id} before retrying multiple purchases.`}
              subject={`TicketSystem payment confirmation help for ${order.id}`}
              title="Need help with this order?"
            />
          </>
        ) : null}

        {!orderQuery.isLoading && session && !isSuccess && (isCancelled || mode === "cancel" || !order) ? (
          <>
            <Card padded={false}>
              <View style={styles.cancelShell}>
                <Text style={styles.heroEyebrow}>Checkout not completed</Text>
                <Text style={styles.sectionTitle}>No charge was confirmed in the app.</Text>
                <Text style={styles.copy}>
                  You can reopen discovery to choose a different event or return to wallet without losing your current account session.
                </Text>
                <View style={styles.ctaStack}>
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
              body="If you saw a bank or card charge but this screen did not confirm payment, contact support before trying the same purchase again."
              subject="TicketSystem checkout return follow-up"
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
