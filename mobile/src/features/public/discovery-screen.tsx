import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, EmptyStateCard, LoadingStateCard, Screen } from "@/components/ui";
import { listPublicEvents } from "@/lib/events/public-events-client";
import { palette } from "@/styles/theme";

type CardVariant = "compact" | "featured";

type EventSummaryForCard = {
  ticketTypes: Array<{
    currency: string;
    priceValue: number;
    pricingMode: "FIXED" | "FREE" | "OFFER_RANGE";
  }>;
};

function getPriceLabel(event: EventSummaryForCard) {
  if (!event.ticketTypes.length) {
    return "Tickets soon";
  }

  const hasFree = event.ticketTypes.some(
    (ticket) => ticket.pricingMode === "FREE" || ticket.priceValue <= 0,
  );
  const paidPrices = event.ticketTypes
    .filter((ticket) => ticket.pricingMode !== "FREE" && ticket.priceValue > 0)
    .map((ticket) => ticket.priceValue);
  const currency = event.ticketTypes[0]?.currency ?? "EUR";

  if (hasFree && paidPrices.length) {
    const max = Math.max(...paidPrices);
    return `Free - ${new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(max)}`;
  }

  if (hasFree) {
    return "Free";
  }

  if (!paidPrices.length) {
    return "Tickets soon";
  }

  const min = Math.min(...paidPrices);
  const max = Math.max(...paidPrices);

  if (min === max) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(min);
  }

  return `From ${new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(min)}`;
}

function EventCard({
  coverImageUrl,
  href,
  priceLabel,
  scheduleLabel,
  title,
  variant = "compact",
  venueLabel,
}: {
  coverImageUrl?: string | null;
  href: React.ComponentProps<typeof Link>["href"];
  priceLabel: string;
  scheduleLabel: string;
  title: string;
  variant?: CardVariant;
  venueLabel: string;
}) {
  const isFeatured = variant === "featured";

  return (
    <Link asChild href={href}>
      <Pressable
        style={({ pressed }) => [
          styles.cardPressable,
          pressed ? styles.cardPressablePressed : null,
        ]}
      >
        <Card density={isFeatured ? "comfortable" : "dense"} padded={false}>
          <View style={styles.cardImageWrap}>
            <ImageBackground
              imageStyle={styles.cardImage}
              source={coverImageUrl ? { uri: coverImageUrl } : undefined}
              style={[styles.cardImage, isFeatured ? styles.cardImageFeatured : null]}
            >
              <View style={styles.cardImageGradient} />
              <View style={styles.cardTopRow}>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>{priceLabel}</Text>
                </View>
              </View>
              {!coverImageUrl ? (
                <View style={styles.imageFallbackBadge}>
                  <Text style={styles.imageFallbackText}>No image yet</Text>
                </View>
              ) : null}
            </ImageBackground>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={isFeatured ? 2 : 1}>
              {title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.cardMeta} numberOfLines={1}>🗓 {scheduleLabel}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>📍 {venueLabel}</Text>
            </View>
            <View style={styles.cardFooterRow}>
              <Text style={styles.ctaText}>{isFeatured ? "Get tickets" : "View event"}</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export function DiscoveryScreen() {
  const { session } = useAuth();
  const featuredFade = useRef(new Animated.Value(0)).current;
  const upcomingFade = useRef(new Animated.Value(0)).current;
  const walletFade = useRef(new Animated.Value(0)).current;
  const eventsQuery = useQuery({
    queryFn: listPublicEvents,
    queryKey: ["public-events"],
  });

  const events = eventsQuery.data ?? [];
  const [featuredEvent, ...moreEvents] = events;

  useEffect(() => {
    if (eventsQuery.isLoading || eventsQuery.isError) {
      return;
    }

    featuredFade.setValue(0);
    upcomingFade.setValue(0);
    walletFade.setValue(0);

    Animated.sequence([
      Animated.timing(featuredFade, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(upcomingFade, {
        duration: 200,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(walletFade, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [eventsQuery.isError, eventsQuery.isLoading, featuredFade, upcomingFade, walletFade]);

  return (
    <Screen
      title="Discover events"
      subtitle="Find your next event."
      compactHeader
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false} tone="accent">
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Mobile front door</Text>
            <Text style={styles.heroTitle}>Browse events before you commit</Text>
            <Text style={styles.heroCopy}>Open, scan, decide.</Text>
            <View style={styles.heroMetrics}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Live events</Text>
                <Text style={styles.metricValue}>{events.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Wallet path</Text>
                <Text style={styles.metricValue}>Ready</Text>
              </View>
            </View>
            {session ? (
              <Link href="/(tabs)/wallet" style={styles.heroLink}>
                Return to wallet
              </Link>
            ) : (
              <Link href="/(auth)/register" style={styles.heroLink}>
                Create an attendee account
              </Link>
            )}
          </View>
        </Card>

        {eventsQuery.isLoading ? (
          <LoadingStateCard
            subtitle="Collecting the latest public events for mobile."
            title="Loading discovery"
          />
        ) : null}

        {eventsQuery.isError ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Discovery is unavailable right now</Text>
            <Text style={styles.copy}>Public events could not be loaded.</Text>
            <ActionButton onPress={() => void eventsQuery.refetch()} title="Retry discovery" />
          </Card>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && featuredEvent ? (
          <Animated.View style={[styles.fadeBlock, { opacity: featuredFade }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Featured</Text>
              <Text style={styles.sectionTitle}>Start here</Text>
            </View>
            <EventCard
              coverImageUrl={featuredEvent.coverImageUrl}
              href={{
                pathname: "/(public)/events/[slug]",
                params: { slug: featuredEvent.slug },
              }}
              priceLabel={getPriceLabel({ ticketTypes: featuredEvent.ticketTypes })}
              scheduleLabel={featuredEvent.scheduleLabel}
              title={featuredEvent.title}
              variant="featured"
              venueLabel={featuredEvent.venueLabel}
            />
          </Animated.View>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && moreEvents.length > 0 ? (
          <Animated.View style={[styles.fadeBlock, { opacity: upcomingFade }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Upcoming</Text>
              <Text style={styles.sectionTitle}>More events</Text>
            </View>
            <View style={styles.stack}>
              {moreEvents.map((event) => (
                <EventCard
                  coverImageUrl={event.coverImageUrl}
                  key={event.id}
                  href={{
                    pathname: "/(public)/events/[slug]",
                    params: { slug: event.slug },
                  }}
                  priceLabel={getPriceLabel({ ticketTypes: event.ticketTypes })}
                  scheduleLabel={event.scheduleLabel}
                  title={event.title}
                  venueLabel={event.venueLabel}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 ? (
          <EmptyStateCard
            subtitle="The next published event will appear here."
            title="No public events live yet"
          />
        ) : null}

        {session ? (
          <Animated.View style={[styles.fadeBlock, { opacity: walletFade }]}>
            <Card>
              <Text style={styles.sectionTitle}>Wallet</Text>
              <Link href="/(tabs)/wallet" style={styles.footerLink}>
                Return to wallet
              </Link>
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    gap: 8,
    padding: 14,
  },
  cardFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cardImage: {
    backgroundColor: palette.backgroundMuted,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    height: 190,
    width: "100%",
  },
  cardImageFeatured: {
    height: 220,
  },
  cardImageGradient: {
    backgroundColor: "rgba(0,0,0,0.12)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cardImageWrap: {
    marginBottom: 0,
    overflow: "hidden",
    position: "relative",
  },
  cardMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  cardPressable: {
    alignSelf: "stretch",
    width: "100%",
  },
  cardPressablePressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  cardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
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
  ctaText: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "800",
  },
  footerLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
  },
  fadeBlock: {
    gap: 12,
  },
  heroCopy: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.9,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroLink: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "700",
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
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
    maxWidth: 320,
  },
  imageFallbackBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageFallbackText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    gap: 2,
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 84,
    padding: 14,
  },
  metricLabel: {
    color: "#dbc7b6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricValue: {
    color: palette.white,
    fontSize: 20,
    fontWeight: "700",
  },
  pricePill: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pricePillText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
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
  stack: {
    gap: 14,
  },
});
