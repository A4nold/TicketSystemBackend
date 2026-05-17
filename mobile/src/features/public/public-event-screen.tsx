import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { getPublicEventBySlug } from "@/lib/events/public-events-client";
import { createTicketOfferRequest } from "@/lib/offers/offers-client";
import { palette } from "@/styles/theme";

export function PublicEventScreen({
  initialOfferPrice,
  initialQuantity,
  initialTicketTypeId,
  slug,
}: {
  initialOfferPrice?: number;
  initialQuantity?: number;
  initialTicketTypeId?: string;
  slug: string;
}) {
  const { session } = useAuth();
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerFeedback, setOfferFeedback] = useState<string | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const eventQuery = useQuery({
    queryFn: () => getPublicEventBySlug(slug),
    queryKey: ["public-event", slug],
  });

  useEffect(() => {
    if (!eventQuery.data) {
      return;
    }

    const defaultTicketType =
      eventQuery.data.ticketTypes.find((ticketType) => ticketType.id === initialTicketTypeId) ??
      eventQuery.data.ticketTypes.find((ticketType) => ticketType.isPurchasable) ??
      eventQuery.data.ticketTypes[0] ??
      null;

    setSelectedTicketTypeId((current) => current || defaultTicketType?.id || "");
    setQuantity(
      initialQuantity && Number.isFinite(initialQuantity) && initialQuantity >= 1
        ? initialQuantity
        : 1,
    );
    setOfferPrice(
      initialOfferPrice && Number.isFinite(initialOfferPrice) && initialOfferPrice > 0
        ? initialOfferPrice
        : defaultTicketType?.minOfferPriceValue ?? 0,
    );
  }, [eventQuery.data]);

  if (eventQuery.isLoading) {
    return (
      <Screen title="Event details" subtitle="Loading the public event experience.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Loading event details</Text>
            <Text style={styles.copy}>We are preparing the event page for mobile browsing.</Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    const message =
      eventQuery.error instanceof ApiError
        ? eventQuery.error.message
        : "This event could not be loaded right now.";

    return (
      <Screen title="Event details" subtitle="The event page could not be opened right now.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Event unavailable</Text>
            <Text style={styles.copy}>{message}</Text>
            <ActionButton onPress={() => void eventQuery.refetch()} title="Retry event page" />
          </Card>
          <Link href="/(public)" style={styles.backLink}>
            Back to discovery
          </Link>
        </ScrollView>
      </Screen>
    );
  }

  const event = eventQuery.data;
  const selectedTicketType =
    event.ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) ??
    event.ticketTypes[0] ??
    null;
  const maxQuantity = selectedTicketType ? Math.max(1, selectedTicketType.maxPerOrder ?? 6) : 1;
  const isOfferRange = selectedTicketType?.pricingMode === "OFFER_RANGE";
  const isTicketPurchasable = selectedTicketType?.isPurchasable ?? false;

  const checkoutHref = selectedTicketType
    ? {
        pathname: "/checkout/start" as const,
        params: {
          eventSlug: event.slug,
          quantity: String(quantity),
          ticketTypeId: selectedTicketType.id,
        },
      }
    : null;

  return (
    <Screen title={event.title} subtitle={event.scheduleLabel}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false} tone="accent">
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Public event</Text>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroCopy}>{event.description ?? "Open ticket options and decide when you are ready to continue."}</Text>
            <Text style={styles.heroMeta}>{event.venueLabel}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>What to expect</Text>
          <Text style={styles.copy}>
            Organised by {event.organizerName}. {event.trustCopy}
          </Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Tickets</Text>
          <Text style={styles.sectionTitle}>Choose the right level, then keep moving</Text>
          <Text style={styles.copy}>
            Pick the ticket that fits, set your quantity, and continue into checkout without losing
            the event context.
          </Text>
        </View>

        <View style={styles.stack}>
          {event.ticketTypes.map((ticketType) => (
            <Pressable
              key={ticketType.id}
              onPress={() => {
                setSelectedTicketTypeId(ticketType.id);
                setQuantity(1);
                setOfferPrice(ticketType.minOfferPriceValue ?? 0);
                setOfferFeedback(null);
              }}
            >
              <Card>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTitle}>{ticketType.name}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      ticketType.availabilityTone === "available"
                        ? styles.statusPillSuccess
                        : ticketType.availabilityTone === "warning"
                          ? styles.statusPillWarning
                          : null,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{ticketType.availabilityLabel}</Text>
                  </View>
                </View>
                {selectedTicketTypeId === ticketType.id ? (
                  <Text style={styles.selectedLabel}>Selected for checkout</Text>
                ) : null}
                <Text style={styles.ticketPrice}>{ticketType.priceLabel}</Text>
                {ticketType.description ? <Text style={styles.copy}>{ticketType.description}</Text> : null}
                <Text style={styles.ticketMeta}>{ticketType.quantityLabel}</Text>
                <Text style={styles.copy}>{ticketType.restrictionCopy}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Continue from here</Text>
          <Text style={styles.copy}>
            {selectedTicketType
              ? `You are continuing with ${selectedTicketType.name}.`
              : "Choose a ticket type to continue."}
          </Text>
          {selectedTicketType ? (
            <View style={styles.ctaStack}>
              {!isOfferRange ? (
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <Pressable
                      onPress={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {session && checkoutHref && !isOfferRange && isTicketPurchasable ? (
                <Link href={checkoutHref} style={styles.primaryLink}>
                  Continue to checkout
                </Link>
              ) : null}
              {session && isOfferRange && isTicketPurchasable ? (
                <>
                  <Text style={styles.copy}>
                    Choose an offer between {selectedTicketType.offerRangeLabel ?? "the configured range"}.
                  </Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      onPress={() =>
                        setOfferPrice((current) =>
                          Math.max(selectedTicketType.minOfferPriceValue ?? 0, current - 1),
                        )
                      }
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.quantityValue}>
                      {new Intl.NumberFormat("en-IE", {
                        currency: selectedTicketType.currency,
                        style: "currency",
                      }).format(offerPrice)}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setOfferPrice((current) =>
                          Math.min(selectedTicketType.maxOfferPriceValue ?? current, current + 1),
                        )
                      }
                      style={styles.quantityButton}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                  <ActionButton
                    disabled={isSubmittingOffer}
                    onPress={() => {
                      void (async () => {
                        if (!session?.accessToken) {
                          return;
                        }
                        setOfferFeedback(null);
                        setIsSubmittingOffer(true);
                        try {
                          await createTicketOfferRequest(
                            event.id,
                            selectedTicketType.id,
                            offerPrice.toFixed(2),
                            session.accessToken,
                          );
                          setOfferFeedback("Offer sent. Watch notifications for organizer response.");
                        } catch (error) {
                          setOfferFeedback(error instanceof Error ? error.message : "Offer request failed.");
                        } finally {
                          setIsSubmittingOffer(false);
                        }
                      })();
                    }}
                    title={isSubmittingOffer ? "Sending offer..." : "Send offer"}
                  />
                </>
              ) : null}
              {!session && checkoutHref && isTicketPurchasable ? (
                <>
                  <Link
                    href={{
                      pathname: "/(auth)/register",
                      params: {
                        eventSlug: event.slug,
                        eventTitle: event.title,
                        quantity: String(quantity),
                        ticketTypeId: selectedTicketType.id,
                        ...(isOfferRange
                          ? {
                              flow: "offer-range",
                              offerPrice: offerPrice.toFixed(2),
                            }
                          : {}),
                      },
                    }}
                    style={styles.primaryLink}
                  >
                    Create account to continue
                  </Link>
                  <Link
                    href={{
                      pathname: "/(auth)/login",
                      params: {
                        eventSlug: event.slug,
                        eventTitle: event.title,
                        quantity: String(quantity),
                        ticketTypeId: selectedTicketType.id,
                        ...(isOfferRange
                          ? {
                              flow: "offer-range",
                              offerPrice: offerPrice.toFixed(2),
                            }
                          : {}),
                      },
                    }}
                    style={styles.secondaryLink}
                  >
                    I already have an account
                  </Link>
                </>
              ) : null}
              {!isTicketPurchasable ? (
                <Text style={styles.copy}>
                  Sales for this ticket are not active right now, so checkout is unavailable.
                </Text>
              ) : null}
              {offerFeedback ? <Text style={styles.copy}>{offerFeedback}</Text> : null}
            </View>
          ) : null}
          {session ? (
            <Link href="/(tabs)/wallet" style={styles.secondaryLink}>
              Return to wallet
            </Link>
          ) : null}
        </Card>

        <Link href="/(public)" style={styles.backLink}>
          Back to discovery
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
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
    gap: 14,
    padding: 22,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
  },
  primaryLink: {
    color: palette.accentDeep,
    fontSize: 15,
    fontWeight: "800",
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  quantityButtonText: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  quantityControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  quantityLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quantityValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
    minWidth: 24,
    textAlign: "center",
  },
  secondaryLink: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionEyebrow: {
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  selectedLabel: {
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  stack: {
    gap: 14,
  },
  statusPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillSuccess: {
    backgroundColor: palette.successSoft,
    borderColor: "#b8d9ca",
  },
  statusPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusPillWarning: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
  },
  ticketHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  ticketMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  ticketPrice: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  ticketTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
});
