import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as ExpoLinking from "expo-linking";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { getPublicEventBySlug } from "@/lib/events/public-events-client";
import { createCheckoutOrder } from "@/lib/orders/orders-client";
import { palette } from "@/styles/theme";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `checkout-${crypto.randomUUID()}`;
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IE", {
    currency: "EUR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function CheckoutStartScreen() {
  const params = useLocalSearchParams<{
    eventSlug?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const eventSlug = typeof params.eventSlug === "string" ? params.eventSlug : "";
  const ticketTypeId = typeof params.ticketTypeId === "string" ? params.ticketTypeId : "";
  const quantity = Math.max(1, Number(params.quantity ?? "1") || 1);

  const eventQuery = useQuery({
    enabled: Boolean(eventSlug),
    queryFn: () => getPublicEventBySlug(eventSlug),
    queryKey: ["checkout-start-event", eventSlug],
  });

  if (!session) {
    return (
      <Screen title="Continue to checkout" subtitle="Sign in first to keep this ticket selection.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="accent">
            <Text style={styles.sectionTitle}>Your selection is ready</Text>
            <Text style={styles.copy}>
              Sign in or create an attendee account first, then continue into checkout with this
              exact ticket selection.
            </Text>
            <View style={styles.ctaStack}>
              <Link
                href={{
                  pathname: "/(auth)/login",
                  params: {
                    eventSlug,
                    quantity: String(quantity),
                    ticketTypeId,
                  },
                }}
                style={styles.primaryLink}
              >
                Sign in to continue
              </Link>
              <Link
                href={{
                  pathname: "/(auth)/register",
                  params: {
                    eventSlug,
                    quantity: String(quantity),
                    ticketTypeId,
                  },
                }}
                style={styles.secondaryLink}
              >
                Create attendee account
              </Link>
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (eventQuery.isError) {
    return (
      <Screen title="Continue to checkout" subtitle="This selection could not be prepared right now.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Selection unavailable</Text>
            <Text style={styles.copy}>
              The latest event data could not be loaded. Return to the event page and try again.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (eventQuery.isLoading || !eventQuery.data) {
    return (
      <Screen title="Continue to checkout" subtitle="Preparing your ticket selection.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Loading selection</Text>
            <Text style={styles.copy}>We are checking the latest public event availability.</Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const activeSession = session;
  const event = eventQuery.data;
  const selectedTicketType =
    event.ticketTypes.find((candidate) => candidate.id === ticketTypeId) ?? event.ticketTypes[0] ?? null;

  if (!selectedTicketType) {
    return (
      <Screen title="Continue to checkout" subtitle="This ticket selection is incomplete.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Ticket selection missing</Text>
            <Text style={styles.copy}>
              Return to the event page and choose a ticket type before checkout begins.
            </Text>
          </Card>
          <Link
            href={{
              pathname: "/(public)/events/[slug]",
              params: { slug: event.slug },
            }}
            style={styles.secondaryLink}
          >
            Back to event details
          </Link>
        </ScrollView>
      </Screen>
    );
  }

  const subtotal = selectedTicketType.priceValue * quantity;
  const fee = subtotal * 0.1;
  const total = subtotal + fee;

  async function beginPayment() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const order = await createCheckoutOrder(
        {
          cancelReturnUrl: ExpoLinking.createURL("/checkout/cancel"),
          eventSlug: event.slug,
          idempotencyKey,
          items: [
            {
              quantity,
              ticketTypeId: selectedTicketType.id,
            },
          ],
          paymentProvider: "STRIPE",
          successReturnUrl: ExpoLinking.createURL("/checkout/success"),
        },
        activeSession.accessToken,
      );

      if (!order.checkoutUrl) {
        throw new Error("Checkout URL was not returned by the backend.");
      }

      try {
        await Linking.openURL(order.checkoutUrl);
      } catch {
        const result = await WebBrowser.openBrowserAsync(order.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });

        if (result.type === "cancel") {
          setErrorMessage("Checkout was dismissed before payment could continue.");
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Checkout could not start right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen title="Continue to checkout" subtitle="Review this mobile ticket selection before payment starts.">
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false} tone="accent">
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Checkout start</Text>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroCopy}>{event.scheduleLabel}</Text>
            <Text style={styles.heroMeta}>{event.venueLabel}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ticket selection</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Ticket type</Text>
              <Text style={styles.summaryValue}>{selectedTicketType.name}</Text>
              <Text style={styles.copy}>{selectedTicketType.priceLabel} each</Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>
                {quantity} ticket{quantity === 1 ? "" : "s"}
              </Text>
              <Text style={styles.copy}>
                {selectedTicketType.maxPerOrder
                  ? `Limit ${selectedTicketType.maxPerOrder} per order`
                  : "This selection can continue into checkout now."}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Pricing summary</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.copy}>
              {selectedTicketType.name} x {quantity}
            </Text>
            <Text style={styles.pricingValue}>{formatMoney(subtotal)}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.copy}>Estimated service fee</Text>
            <Text style={styles.pricingValue}>{formatMoney(fee)}</Text>
          </View>
          <View style={[styles.pricingRow, styles.pricingTotal]}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
          </View>
          <ActionButton
            loading={isSubmitting}
            onPress={() => void beginPayment()}
            title="Continue to secure payment"
          />
          <Link
            href={{
              pathname: "/(public)/events/[slug]",
              params: { slug: event.slug },
            }}
            style={styles.secondaryLink}
          >
            Back to event details
          </Link>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        </Card>
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
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroMeta: {
    color: "#f7e8da",
    fontSize: 13,
    fontWeight: "600",
  },
  heroShell: {
    backgroundColor: palette.black,
    gap: 12,
    padding: 22,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 33,
  },
  pricingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pricingTotal: {
    borderTopColor: palette.divider,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  pricingValue: {
    color: palette.ink,
    fontSize: 15,
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
    textAlign: "center",
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryBlock: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  summaryLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  totalLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  totalValue: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: "800",
  },
});
