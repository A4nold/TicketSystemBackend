import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import {
  capturePublicEventShareAnalytics,
  generatePublicEventFlyer,
  getPublicEventBySlug,
  type PublicEventShareAction,
} from "@/lib/events/public-events-client";
import { getCurrencyLocale } from "@/lib/formatters";
import { createTicketOfferRequest } from "@/lib/offers/offers-client";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function PublicEventScreen({
  authReturn,
  initialOfferPrice,
  initialQuantity,
  initialTicketTypeId,
  slug,
}: {
  authReturn?: boolean;
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
  const [showMoreEventSummary, setShowMoreEventSummary] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const hasTrackedPublicViewRef = useRef(false);
  const hasShownAuthRestoreFeedbackRef = useRef(false);
  const stickyOpacity = useRef(new Animated.Value(0)).current;
  const stickyTranslateY = useRef(new Animated.Value(14)).current;
  const detailOpacity = useRef(new Animated.Value(0)).current;
  const detailTranslateY = useRef(new Animated.Value(8)).current;
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
  }, [eventQuery.data, initialOfferPrice, initialQuantity, initialTicketTypeId]);

  useEffect(() => {
    if (!authReturn || !eventQuery.data || hasShownAuthRestoreFeedbackRef.current) {
      return;
    }
    hasShownAuthRestoreFeedbackRef.current = true;
    setOfferFeedback("Welcome back. Your ticket selection is ready.");
  }, [authReturn, eventQuery.data]);

  function getPublicEventUrl(eventSlug: string) {
    return `https://mayaapp.vercel.app/events/${eventSlug}`;
  }

  function trackShareEvent(
    eventId: string,
    eventAction: PublicEventShareAction,
    metadata?: Record<string, unknown>,
  ) {
    void capturePublicEventShareAnalytics(eventId, {
      eventAction,
      metadata,
      sourceSurface: "mobile",
    }).catch(() => {
      // analytics should never block checkout/share actions
    });
  }

  useEffect(() => {
    if (!eventQuery.data || hasTrackedPublicViewRef.current) {
      return;
    }
    hasTrackedPublicViewRef.current = true;
    trackShareEvent(eventQuery.data.id, "PUBLIC_EVENT_PAGE_VIEWED", {
      eventSlug: eventQuery.data.slug,
    });
  }, [eventQuery.data]);

  const selectedTicketTypeForAnim =
    eventQuery.data?.ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) ??
    eventQuery.data?.ticketTypes[0] ??
    null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stickyOpacity, {
        duration: 180,
        toValue: selectedTicketTypeForAnim ? 1 : 0.92,
        useNativeDriver: true,
      }),
      Animated.timing(stickyTranslateY, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [offerPrice, quantity, selectedTicketTypeForAnim, selectedTicketTypeId, stickyOpacity, stickyTranslateY]);

  useEffect(() => {
    detailOpacity.setValue(0);
    detailTranslateY.setValue(8);
    Animated.parallel([
      Animated.timing(detailOpacity, {
        duration: 170,
        toValue: selectedTicketTypeForAnim ? 1 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(detailTranslateY, {
        duration: 170,
        toValue: selectedTicketTypeForAnim ? 0 : 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [detailOpacity, detailTranslateY, selectedTicketTypeForAnim, selectedTicketTypeId]);

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

  const stickyCtaLabel = (() => {
    if (!selectedTicketType) {
      return "Choose ticket";
    }
    if (!isTicketPurchasable) {
      return "Unavailable";
    }
    if (!session) {
      return isOfferRange ? "Sign up to offer" : "Sign up to get tickets";
    }
    return isOfferRange ? "Send offer" : "Get tickets";
  })();

  const stickyMetaLabel = (() => {
    if (!selectedTicketType) {
      return "Select a ticket to continue";
    }
    if (isOfferRange) {
      return `Your offer · ${selectedTicketType.priceLabel}`;
    }
    return `${selectedTicketType.priceLabel} · ${quantity} selected`;
  })();

  async function handleShareEventLink() {
    const link = getPublicEventUrl(event.slug);
    trackShareEvent(event.id, "EVENT_SHARE_CLICKED", {
      method: "native-share",
    });

    try {
      await Share.share({
        message: `Get your ticket on Maya: ${link}`,
        url: link,
      });
    } catch {
      // no-op for cancelled or unavailable native share targets
    }
  }

  async function handleCopyEventLink() {
    const link = getPublicEventUrl(event.slug);
    try {
      await Clipboard.setStringAsync(link);
      setOfferFeedback("Event link copied.");
      trackShareEvent(event.id, "EVENT_LINK_COPIED", {
        method: "clipboard",
      });
    } catch {
      setOfferFeedback("Could not copy link right now.");
    }
  }

  async function handleGenerateFlyer(size: "4x5" | "A4" | "9x16") {
    trackShareEvent(event.id, "EVENT_FLYER_GENERATED", { size });
    try {
      const flyer = await generatePublicEventFlyer(event.id, size);
      await Linking.openURL(flyer.imageUrl);
      trackShareEvent(event.id, "EVENT_FLYER_DOWNLOADED", {
        size: flyer.size,
        output: "svg",
      });
    } catch (error) {
      setOfferFeedback(
        error instanceof Error
          ? error.message
          : "Flyer could not be generated right now.",
      );
    }
  }

  const authRegisterHref = selectedTicketType
    ? {
        pathname: "/(auth)/register" as const,
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
      }
    : "/(auth)/register";

  const authLoginHref = selectedTicketType
    ? {
        pathname: "/(auth)/login" as const,
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
      }
    : "/(auth)/login";

  async function handleOfferSubmit() {
    if (!session?.accessToken || !selectedTicketType) {
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
  }

  return (
    <Screen title={event.title} subtitle={event.scheduleLabel}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card padded={false} tone="accent">
            <ImageBackground
              source={event.coverImageUrl ? { uri: event.coverImageUrl } : undefined}
              imageStyle={event.coverImageUrl ? styles.heroImage : undefined}
              style={styles.heroMedia}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroShell}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroEyebrow}>Public event</Text>
                  <Pressable onPress={() => setShowActionsSheet(true)} style={styles.iconActionChip}>
                    <Text style={styles.iconActionText}>⋯ Actions</Text>
                  </Pressable>
                </View>
                <Text style={styles.heroTitle}>{event.title}</Text>
                <Text style={styles.heroMeta}>🗓 {event.scheduleLabel}</Text>
                <Text style={styles.heroMeta}>📍 {event.venueLabel}</Text>
              </View>
            </ImageBackground>
          </Card>

          <Card>
            <View style={styles.infoList}>
              <Text style={styles.metaRow}>👤 {event.organizerName}</Text>
            </View>
            <Text style={styles.copy} numberOfLines={showMoreEventSummary ? undefined : 2}>
              {event.description ?? "Open ticket options and decide when you are ready to continue."}
            </Text>
            {event.description ? (
              <Pressable onPress={() => setShowMoreEventSummary((current) => !current)}>
                <Text style={styles.secondaryLink}>
                  {showMoreEventSummary ? "Show less" : "Show more"}
                </Text>
              </Pressable>
            ) : null}
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Tickets</Text>
            <Text style={styles.sectionTitle}>Choose your ticket</Text>
          </View>

          <View style={styles.ticketRows}>
            {event.ticketTypes.map((ticketType) => {
              const isSelected = selectedTicketTypeId === ticketType.id;
              return (
                <Pressable
                  key={ticketType.id}
                  accessibilityHint="Opens ticket details and sets it as active for checkout."
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${ticketType.name}, ${ticketType.priceLabel}, ${ticketType.availabilityLabel}`}
                  hitSlop={8}
                  onPress={() => {
                    animateLayout();
                    setSelectedTicketTypeId(ticketType.id);
                    setQuantity(1);
                    setOfferPrice(ticketType.minOfferPriceValue ?? 0);
                    setOfferFeedback(null);
                  }}
                  style={({ pressed }) => [
                    styles.ticketRow,
                    isSelected ? styles.ticketRowSelected : null,
                    pressed ? styles.ticketRowPressed : null,
                  ]}
                >
                  <View style={styles.ticketRowLeft}>
                    <Text style={styles.ticketRowTitle} numberOfLines={1}>{ticketType.name}</Text>
                    <Text style={styles.ticketRowMeta} numberOfLines={1}>🗓 {ticketType.quantityLabel}</Text>
                  </View>
                  <View style={styles.ticketRowRight}>
                    <Text style={styles.ticketRowPrice}>{ticketType.priceLabel}</Text>
                    <Text style={styles.ticketRowStatus}>{ticketType.availabilityLabel}</Text>
                  </View>
                  <View style={[styles.selectionDot, isSelected ? styles.selectionDotActive : null]} />
                </Pressable>
              );
            })}
          </View>

          {selectedTicketType ? (
            <Animated.View
              style={{
                opacity: detailOpacity,
                transform: [{ translateY: detailTranslateY }],
              }}
            >
              <Card>
              <Text style={styles.selectionTitle}>{selectedTicketType.name}</Text>
              <Text style={styles.copy} numberOfLines={2}>
                {selectedTicketType.description ?? selectedTicketType.restrictionCopy}
              </Text>

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
              ) : (
                <>
                  <Text style={styles.copy}>
                    Offer range: {selectedTicketType.offerRangeLabel ?? "configured by organizer"}
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
                      {new Intl.NumberFormat(
                        getCurrencyLocale(selectedTicketType.currency),
                        {
                          currency: selectedTicketType.currency,
                          style: "currency",
                        },
                      ).format(offerPrice)}
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
                </>
              )}

              {!isTicketPurchasable ? (
                <Text style={styles.copy}>
                  Sales for this ticket are not active right now, so checkout is unavailable.
                </Text>
              ) : null}

              {offerFeedback ? <Text style={styles.copy}>{offerFeedback}</Text> : null}
              </Card>
            </Animated.View>
          ) : null}

          <Link href="/(public)" style={styles.backLink}>
            Back to discovery
          </Link>
        </ScrollView>

        <Animated.View
          style={[
            styles.stickyFooterWrap,
            {
              opacity: stickyOpacity,
              transform: [{ translateY: stickyTranslateY }],
            },
          ]}
        >
          <View style={styles.stickyFooter}>
            <View style={styles.stickyCopy}>
              <Text style={styles.stickyTicketName} numberOfLines={1}>
                {selectedTicketType?.name ?? "Select ticket"}
              </Text>
              <Text style={styles.stickyTicketMeta} numberOfLines={1}>
                {stickyMetaLabel}
              </Text>
            </View>

            {selectedTicketType && isTicketPurchasable ? (
              <View style={styles.stickyActionWrap}>
                {session && checkoutHref && !isOfferRange ? (
                  <Link
                    href={checkoutHref}
                    onPress={() =>
                      trackShareEvent(event.id, "GET_TICKET_FROM_PUBLIC_PAGE_CLICKED", {
                        entryPoint: "checkout",
                        ticketTypeId: selectedTicketType.id,
                      })
                    }
                    style={styles.stickyPrimaryLink}
                  >
                    {stickyCtaLabel}
                  </Link>
                ) : null}

                {!session && !isOfferRange ? (
                  <Link
                    href={authRegisterHref}
                    onPress={() =>
                      trackShareEvent(event.id, "GET_TICKET_FROM_PUBLIC_PAGE_CLICKED", {
                        entryPoint: "register",
                        ticketTypeId: selectedTicketType.id,
                      })
                    }
                    style={styles.stickyPrimaryLink}
                  >
                    {stickyCtaLabel}
                  </Link>
                ) : null}

                {session && isOfferRange ? (
                  <ActionButton
                    disabled={isSubmittingOffer}
                    onPress={() => void handleOfferSubmit()}
                    title={isSubmittingOffer ? "Sending..." : stickyCtaLabel}
                  />
                ) : null}

                {!session && isOfferRange ? (
                  <Link
                    href={authRegisterHref}
                    onPress={() =>
                      trackShareEvent(event.id, "GET_TICKET_FROM_PUBLIC_PAGE_CLICKED", {
                        entryPoint: "register",
                        ticketTypeId: selectedTicketType.id,
                      })
                    }
                    style={styles.stickyPrimaryLink}
                  >
                    {stickyCtaLabel}
                  </Link>
                ) : null}

                {!session ? (
                  <Link
                    href={authLoginHref}
                    onPress={() =>
                      trackShareEvent(event.id, "GET_TICKET_FROM_PUBLIC_PAGE_CLICKED", {
                        entryPoint: "login",
                        ticketTypeId: selectedTicketType.id,
                      })
                    }
                    style={styles.stickySecondaryLink}
                  >
                    Already have an account? Sign in
                  </Link>
                ) : null}
              </View>
            ) : (
              <Text style={styles.stickyDisabled}>{stickyCtaLabel}</Text>
            )}
          </View>
        </Animated.View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setShowActionsSheet(false)} transparent visible={showActionsSheet}>
        <Pressable onPress={() => setShowActionsSheet(false)} style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Event actions</Text>
            <ActionButton
              onPress={() => {
                setShowActionsSheet(false);
                void handleGenerateFlyer("4x5");
              }}
              title="Generate flyer (4:5)"
              variant="secondary"
            />
            <ActionButton
              onPress={() => {
                setShowActionsSheet(false);
                void handleGenerateFlyer("A4");
              }}
              title="Generate flyer (A4)"
              variant="secondary"
            />
            <ActionButton
              onPress={() => {
                setShowActionsSheet(false);
                void handleGenerateFlyer("9x16");
              }}
              title="Generate flyer (Story)"
              variant="secondary"
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    gap: 16,
    padding: 20,
    paddingBottom: 180,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroImage: {
    borderRadius: 0,
  },
  heroMedia: {
    backgroundColor: palette.black,
    minHeight: 240,
    overflow: "hidden",
    position: "relative",
  },
  heroMeta: {
    color: "#f7e8da",
    fontSize: 13,
    fontWeight: "600",
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  heroShell: {
    gap: 10,
    minHeight: 240,
    padding: 22,
    position: "relative",
  },
  heroTitle: {
    color: palette.white,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconActionChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconActionText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "700",
  },
  infoList: {
    gap: 6,
  },
  metaRow: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600",
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
    gap: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  selectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  shell: {
    flex: 1,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.32)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  sheetCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  stickyActionWrap: {
    alignItems: "stretch",
    gap: 6,
    minWidth: 180,
  },
  stickyCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  stickyDisabled: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  stickyFooter: {
    alignItems: "center",
    backgroundColor: palette.glass,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  stickyFooterWrap: {
    backgroundColor: "transparent",
    bottom: 12,
    left: 16,
    position: "absolute",
    right: 16,
  },
  stickyPrimaryLink: {
    backgroundColor: palette.ink,
    borderRadius: 999,
    color: palette.white,
    fontSize: 15,
    fontWeight: "800",
    minHeight: 44,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
    textAlignVertical: "center",
  },
  stickySecondaryLink: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 24,
    textAlign: "center",
  },
  stickyTicketMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  stickyTicketName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  ticketRow: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
    position: "relative",
  },
  ticketRowLeft: {
    flex: 1,
    gap: 3,
    paddingRight: 12,
  },
  ticketRowMeta: {
    color: palette.mutedSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  ticketRowPrice: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  ticketRowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  ticketRowPressed: {
    opacity: 0.97,
    transform: [{ scale: 0.9985 }],
  },
  ticketRows: {
    gap: 10,
  },
  ticketRowSelected: {
    backgroundColor: palette.successSoft,
    borderColor: palette.accentDeep,
    borderWidth: 1.5,
  },
  selectionDot: {
    backgroundColor: "#ffffff",
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    height: 16,
    marginLeft: 10,
    width: 16,
  },
  selectionDotActive: {
    backgroundColor: palette.accentDeep,
    borderColor: palette.accentDeep,
  },
  ticketRowStatus: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  ticketRowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
});
