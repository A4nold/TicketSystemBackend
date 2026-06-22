import { PaymentSheetError, useStripe } from "@stripe/stripe-react-native";
import { useQuery } from "@tanstack/react-query";
import * as ExpoLinking from "expo-linking";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { getStripePublishableKey } from "@/lib/config/env";
import { getPublicEventBySlug } from "@/lib/events/public-events-client";
import { getCurrencyLocale } from "@/lib/formatters";
import { reportMobileRuntimeIssue } from "@/lib/monitoring/runtime-monitoring";
import {
  type CheckoutOrderResponse,
  createCheckoutOrder,
  getCheckoutQuote,
  getOrderById,
} from "@/lib/orders/orders-client";
import { palette } from "@/styles/theme";

function buildAppReturnUrl(
  pathname: "/checkout/success" | "/checkout/cancel",
  orderId?: string,
) {
  const normalizedPath = pathname.replace(/^\//, "");
  const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";

  return `ticketsystem://${normalizedPath}${query}`;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `checkout-${crypto.randomUUID()}`;
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function getPaymentProviderForCurrency(currency: string) {
  return currency.toUpperCase() === "NGN" ? "PAYSTACK" : "STRIPE";
}

function normalizeCheckoutUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return null;
}

function describeFeePolicy(policy: {
  fixedAmount: string;
  fixedFeeApplication: "PER_ORDER" | "PER_TICKET";
  percentRate: string;
  responsibility: "BUYER" | "ORGANIZER";
}, currency: string) {
  const percentLabel = `${(Number(policy.percentRate) * 100).toFixed(2)}%`;
  const fixedLabel = `+ ${currency.toUpperCase()} ${Number(policy.fixedAmount).toFixed(2)} ${
    policy.fixedFeeApplication === "PER_TICKET" ? "per ticket" : "per order"
  }`;

  return policy.responsibility === "BUYER"
    ? `${percentLabel} ${fixedLabel}, paid at checkout`
    : `${percentLabel} ${fixedLabel}, absorbed by the organizer`;
}

export function CheckoutStartScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const params = useLocalSearchParams<{
    eventSlug?: string;
    offerRequestId?: string;
    offerUnlockToken?: string;
    offerIntentId?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAwaitingPaymentReturn, setIsAwaitingPaymentReturn] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const eventSlug = typeof params.eventSlug === "string" ? params.eventSlug : "";
  const offerIntentId =
    typeof params.offerIntentId === "string"
      ? params.offerIntentId
      : typeof params.offerUnlockToken === "string"
        ? params.offerUnlockToken
        : undefined;
  const offerRequestId =
    typeof params.offerRequestId === "string" ? params.offerRequestId : undefined;
  const legacyOfferUnlockToken =
    typeof params.offerUnlockToken === "string" ? params.offerUnlockToken : offerIntentId;
  const ticketTypeId = typeof params.ticketTypeId === "string" ? params.ticketTypeId : "";
  const quantity = Math.max(1, Number(params.quantity ?? "1") || 1);

  const eventQuery = useQuery({
    enabled: Boolean(eventSlug),
    queryFn: () => getPublicEventBySlug(eventSlug),
    queryKey: ["checkout-start-event", eventSlug],
  });
  const event = eventQuery.data ?? null;
  const selectedTicketType =
    event?.ticketTypes.find((candidate) => candidate.id === ticketTypeId) ??
    event?.ticketTypes[0] ??
    null;
  const requiresOfferIntent = selectedTicketType?.pricingMode === "OFFER_RANGE";
  const hasRequiredOfferIntent = !requiresOfferIntent || Boolean(offerIntentId);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.info("[checkout-start] params", {
      eventSlug,
      hasOfferIntentId: Boolean(offerIntentId),
      offerIntentPreview: offerIntentId ? offerIntentId.slice(0, 10) : null,
      quantity,
      ticketTypeId,
    });
  }, [eventSlug, offerIntentId, quantity, ticketTypeId]);

  useEffect(() => {
    if (!__DEV__ || !selectedTicketType) {
      return;
    }

    console.info("[checkout-start] ticket-selection", {
      pricingMode: selectedTicketType.pricingMode,
      requiresOfferIntent,
      hasRequiredOfferIntent,
      selectedTicketTypeId: selectedTicketType.id,
    });
  }, [hasRequiredOfferIntent, requiresOfferIntent, selectedTicketType]);
  const quoteQuery = useQuery({
    enabled: Boolean(
      session?.accessToken && event && selectedTicketType && hasRequiredOfferIntent,
    ),
    queryFn: () =>
      getCheckoutQuote(
        {
          eventSlug: event!.slug,
          offerIntentId,
          offerRequestId,
          offerUnlockToken: legacyOfferUnlockToken,
          items: [
            {
              quantity,
              ticketTypeId: selectedTicketType!.id,
            },
          ],
        },
        session!.accessToken,
      ),
    queryKey: [
      "mobile-checkout-quote",
      event?.slug,
      selectedTicketType?.id,
      offerIntentId,
      quantity,
      session?.accessToken,
    ],
    retry: 1,
  });

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    if (quoteQuery.isSuccess) {
      console.info("[checkout-start] quote-success", {
        currency: quoteQuery.data.currency,
        feeAmount: quoteQuery.data.feeAmount,
        subtotalAmount: quoteQuery.data.subtotalAmount,
        totalAmount: quoteQuery.data.totalAmount,
      });
      return;
    }

    if (quoteQuery.isError) {
      console.warn("[checkout-start] quote-error", {
        error:
          quoteQuery.error instanceof Error
            ? quoteQuery.error.message
            : String(quoteQuery.error),
      });
    }
  }, [quoteQuery.data, quoteQuery.error, quoteQuery.isError, quoteQuery.isSuccess]);

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
                    offerIntentId,
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
                    offerIntentId,
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
              params: { slug: event!.slug },
            }}
            style={styles.secondaryLink}
          >
            Back to event details
          </Link>
        </ScrollView>
      </Screen>
    );
  }

  const resolvedEvent = event!;
  const resolvedTicketType = selectedTicketType;
  const subtotal = resolvedTicketType.priceValue * quantity;
  const stripePublishableKey = getStripePublishableKey();

  async function presentStripeCheckout(order: CheckoutOrderResponse) {
    if (!stripePublishableKey) {
      throw new Error(
        "Stripe mobile checkout is not configured on this build. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and rebuild the app.",
      );
    }

    if (!order.clientSecret) {
      throw new Error("Stripe payment details were not returned by the backend.");
    }

    const paymentSheet = await initPaymentSheet({
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        email: activeSession.user.email,
      },
      merchantDisplayName: "Maya",
      paymentIntentClientSecret: order.clientSecret,
      returnURL: buildAppReturnUrl("/checkout/success", order.id),
    });

    if (paymentSheet.error) {
      throw new Error(paymentSheet.error.message);
    }

    const result = await presentPaymentSheet();

    if (result.error) {
      if (result.error.code === PaymentSheetError.Canceled) {
        router.replace({
          pathname: "/checkout/cancel",
          params: { orderId: order.id },
        });
        return;
      }

      throw new Error(result.error.message);
    }

    router.replace({
      pathname: "/checkout/success",
      params: { orderId: order.id },
    });
  }

  async function beginPayment() {
    setErrorMessage(null);
    setIsSubmitting(true);
    setIsAwaitingPaymentReturn(false);
    setPendingOrderId(null);

    try {
      if (requiresOfferIntent && !offerIntentId) {
        throw new Error(
          "This offer approval link is missing pricing context. Return to the event page and request a new approval.",
        );
      }

      const paymentProvider = quoteQuery.data
        ? getPaymentProviderForCurrency(quoteQuery.data.currency)
        : undefined;
      const isPaystackCheckout = paymentProvider === "PAYSTACK";
      const isStripeCheckout = paymentProvider === "STRIPE";
      const order = await createCheckoutOrder(
        {
          cancelReturnUrl: isPaystackCheckout
            ? undefined
            : buildAppReturnUrl("/checkout/cancel"),
          eventSlug: resolvedEvent.slug,
          idempotencyKey,
          offerIntentId,
          offerRequestId,
          offerUnlockToken: legacyOfferUnlockToken,
          items: [
            {
              quantity,
              ticketTypeId: resolvedTicketType.id,
            },
          ],
          paymentProvider,
          successReturnUrl: isPaystackCheckout
            ? undefined
            : buildAppReturnUrl("/checkout/success"),
        },
        activeSession.accessToken,
      );
      setPendingOrderId(order.id);

      if (order.checkoutFlow === "STRIPE_PAYMENT_INTENT") {
        setIsAwaitingPaymentReturn(true);
        await presentStripeCheckout(order);
        setIsSubmitting(false);
        return;
      }

      if (order.checkoutFlow !== "REDIRECT" || !order.checkoutUrl) {
        if (order.status === "PAID" || order.isAwaitingPaymentConfirmation) {
          router.replace({
            pathname: "/checkout/success",
            params: { orderId: order.id },
          });
          return;
        }

        throw new Error("Checkout URL was not returned by the backend.");
      }

      const successReturnUrl = buildAppReturnUrl("/checkout/success", order.id);
      const cancelReturnUrl = buildAppReturnUrl("/checkout/cancel", order.id);
      if (Platform.OS === "ios" && isPaystackCheckout) {
        router.push({
          pathname: "/checkout/paystack-inline",
          params: {
            cancelReturnUrl,
            checkoutUrl: order.checkoutUrl,
            orderId: order.id,
            successReturnUrl,
          },
        });
        return;
      }

      const normalizedCheckoutUrl = normalizeCheckoutUrl(order.checkoutUrl);
      if (!normalizedCheckoutUrl) {
        void reportMobileRuntimeIssue({
          component: "checkout-start-screen",
          message: "Invalid checkout URL returned by backend.",
          metadata: {
            eventSlug: resolvedEvent.slug,
            orderId: order.id,
            paymentProvider: order.paymentProvider,
            rawCheckoutUrl: order.checkoutUrl,
            selectedTicketTypeId: resolvedTicketType.id,
          },
          route: "/checkout/start",
          type: "checkout-invalid-url",
        });
        throw new Error(
          "Checkout session returned an invalid payment URL. Please retry checkout.",
        );
      }

      const canOpenCheckoutUrl = await Linking.canOpenURL(normalizedCheckoutUrl);
      if (!canOpenCheckoutUrl) {
        void reportMobileRuntimeIssue({
          component: "checkout-start-screen",
          message: "Device rejected checkout URL open attempt.",
          metadata: {
            eventSlug: resolvedEvent.slug,
            normalizedCheckoutUrl,
            orderId: order.id,
            paymentProvider: order.paymentProvider,
            selectedTicketTypeId: resolvedTicketType.id,
          },
          route: "/checkout/start",
          type: "checkout-url-open-rejected",
        });
        throw new Error(
          "Your device could not open the payment URL right now. Please retry checkout.",
        );
      }

      setIsAwaitingPaymentReturn(true);
      await Linking.openURL(normalizedCheckoutUrl);
      setIsSubmitting(false);
      return;
    } catch (error) {
      setIsAwaitingPaymentReturn(false);
      void reportMobileRuntimeIssue({
        component: "checkout-start-screen",
        message:
          error instanceof Error
            ? error.message
            : "Checkout failed before opening payment URL.",
        metadata: {
          eventSlug: resolvedEvent.slug,
          offerIntentIdPresent: Boolean(offerIntentId),
          selectedTicketTypeId: resolvedTicketType.id,
        },
        route: "/checkout/start",
        stack: error instanceof Error ? error.stack : undefined,
        type: "checkout-start-failed",
      });
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
            <Text style={styles.heroTitle}>{resolvedEvent.title}</Text>
            <Text style={styles.heroCopy}>{resolvedEvent.scheduleLabel}</Text>
            <Text style={styles.heroMeta}>{resolvedEvent.venueLabel}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ticket selection</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Ticket type</Text>
              <Text style={styles.summaryValue}>{resolvedTicketType.name}</Text>
              <Text style={styles.copy}>{resolvedTicketType.priceLabel} each</Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>
                {quantity} ticket{quantity === 1 ? "" : "s"}
              </Text>
              <Text style={styles.copy}>
                {resolvedTicketType.maxPerOrder
                  ? `Limit ${resolvedTicketType.maxPerOrder} per order`
                  : "This selection can continue into checkout now."}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Pricing summary</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.copy}>
              {resolvedTicketType.name} x {quantity}
            </Text>
            <Text style={styles.pricingValue}>
              {quoteQuery.data
                ? formatMoney(Number(quoteQuery.data.subtotalAmount), quoteQuery.data.currency)
                : formatMoney(subtotal, resolvedTicketType.currency)}
            </Text>
          </View>
          {quoteQuery.isLoading ? (
            <Text style={styles.copy}>Calculating the exact backend quote now.</Text>
          ) : null}
          {quoteQuery.data ? (
            <>
              <View style={styles.pricingRow}>
                <Text style={styles.copy}>{quoteQuery.data.feePolicy.displayName}</Text>
                <Text style={styles.pricingValue}>
                  {formatMoney(Number(quoteQuery.data.feeAmount), quoteQuery.data.currency)}
                </Text>
              </View>
              <View style={[styles.pricingRow, styles.pricingTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(Number(quoteQuery.data.totalAmount), quoteQuery.data.currency)}
                </Text>
              </View>
              <Text style={styles.copy}>
                {quoteQuery.data.feePolicy.responsibility === "BUYER"
                  ? `${quoteQuery.data.feePolicy.displayName} is included in your checkout total.`
                  : `${quoteQuery.data.feePolicy.displayName} is absorbed by the organizer for this order.`}
              </Text>
              <Text style={styles.policyNote}>
                {describeFeePolicy(quoteQuery.data.feePolicy, quoteQuery.data.currency)}
              </Text>
            </>
          ) : null}
          {quoteQuery.isError ? (
            <Text style={styles.error}>
              Exact pricing could not be confirmed right now. You can still continue and let
              checkout attempt the latest calculation.
            </Text>
          ) : null}
          {requiresOfferIntent && !offerIntentId ? (
            <Text style={styles.error}>
              This approved-offer link is incomplete. Go back to the event page and request a new
              offer approval before checkout.
            </Text>
          ) : null}
          {isAwaitingPaymentReturn ? (
          <Card tone="accent">
              <Text style={styles.sectionTitle}>Completing secure payment</Text>
              <Text style={styles.copy}>
                {quoteQuery.data?.currency.toUpperCase() === "NGN"
                  ? "Secure checkout opened in your browser. Complete payment there and you will be returned here automatically for payment confirmation."
                  : "Stripe payment is in progress. If extra authentication is needed, Maya will guide you back automatically."}
              </Text>
              <Link
                href={{
                  pathname: "/checkout/cancel",
                  params: pendingOrderId ? { orderId: pendingOrderId } : undefined,
                }}
                style={styles.secondaryLink}
              >
                I closed checkout, continue here
              </Link>
            </Card>
          ) : null}
          <ActionButton
            loading={isSubmitting}
            onPress={() => void beginPayment()}
            disabled={isAwaitingPaymentReturn}
            title="Continue to secure payment"
          />
          <Link
            href={{
              pathname: "/(public)/events/[slug]",
              params: { slug: resolvedEvent.slug },
            }}
            style={styles.secondaryLink}
          >
            Back to event details
          </Link>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {errorMessage ? (
            <SupportCard
              body={`If checkout still will not start after retrying, contact support before attempting repeated payments. Include ${resolvedEvent.title} and ${resolvedTicketType.name} in the request.`}
              subject={`TicketSystem checkout start issue for ${resolvedEvent.title}`}
              title="Still not getting into checkout?"
            />
          ) : null}
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
  policyNote: {
    color: palette.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
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
