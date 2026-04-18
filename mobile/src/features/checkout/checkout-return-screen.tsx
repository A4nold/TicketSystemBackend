import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { getOrderById } from "@/lib/orders/orders-client";
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
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Sign in required</Text>
            <Text style={styles.copy}>
              Sign in again to reconnect this checkout result with your attendee wallet.
            </Text>
            <Link href="/(auth)/login" style={styles.primaryLink}>
              Go to sign in
            </Link>
          </Card>
        ) : null}

        {!orderQuery.isLoading && session && isSuccess && order ? (
          <Card tone="success">
            <Text style={styles.sectionTitle}>Payment confirmed</Text>
            <Text style={styles.copy}>
              Order {order.id} is paid. {order.tickets.length > 0 ? "Your tickets are now in the app." : "Ticket issuance is still finalizing."}
            </Text>
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
              <ActionButton onPress={() => void orderQuery.refetch()} title="Refresh order state" variant="secondary" />
            </View>
          </Card>
        ) : null}

        {!orderQuery.isLoading && session && !isSuccess && isPending && order ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Payment still confirming</Text>
            <Text style={styles.copy}>
              We found order {order.id}, but the payment is still being finalized. Refresh before assuming anything is missing.
            </Text>
            <View style={styles.ctaStack}>
              <ActionButton onPress={() => void orderQuery.refetch()} title="Refresh payment status" />
              <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
                Back to wallet
              </Link>
            </View>
          </Card>
        ) : null}

        {!orderQuery.isLoading && session && !isSuccess && (isCancelled || mode === "cancel" || !order) ? (
          <Card>
            <Text style={styles.sectionTitle}>Checkout not completed</Text>
            <Text style={styles.copy}>
              No completed payment was recorded for this return. You can go back to the event page or return to your wallet.
            </Text>
            <View style={styles.ctaStack}>
              <Link href="/(public)" style={styles.primaryLink}>
                Back to discovery
              </Link>
              <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
                Return to wallet
              </Link>
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
  ctaStack: {
    gap: 12,
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
});
