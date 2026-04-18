import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { listPublicEvents } from "@/lib/events/public-events-client";
import { palette } from "@/styles/theme";

function EventCard({
  description,
  href,
  meta,
  title,
}: {
  description: string;
  href: React.ComponentProps<typeof Link>["href"];
  meta: string;
  title: string;
}) {
  return (
    <Link href={href} style={styles.linkReset}>
      <Card>
        <Text style={styles.cardEyebrow}>Public event</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.copy}>{description}</Text>
        <Text style={styles.cardMeta}>{meta}</Text>
      </Card>
    </Link>
  );
}

export function DiscoveryScreen() {
  const { session } = useAuth();
  const eventsQuery = useQuery({
    queryFn: listPublicEvents,
    queryKey: ["public-events"],
  });

  const events = eventsQuery.data ?? [];
  const [featuredEvent, ...moreEvents] = events;

  return (
    <Screen
      title="Discover events"
      subtitle="Find what is happening next, then move into your wallet when you are ready."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false} tone="accent">
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Mobile front door</Text>
            <Text style={styles.heroTitle}>Browse events before you commit</Text>
            <Text style={styles.heroCopy}>
              Explore the next release, open a public event page, and create your account only when
              you are ready to continue.
            </Text>
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
          <Card>
            <Text style={styles.sectionTitle}>Loading discovery</Text>
            <Text style={styles.copy}>We are collecting the latest public events for mobile.</Text>
          </Card>
        ) : null}

        {eventsQuery.isError ? (
          <Card tone="warning">
            <Text style={styles.sectionTitle}>Discovery is unavailable right now</Text>
            <Text style={styles.copy}>
              Public events could not be loaded. Try again and we will restore the browse surface.
            </Text>
            <ActionButton onPress={() => void eventsQuery.refetch()} title="Retry discovery" />
          </Card>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && featuredEvent ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Featured</Text>
              <Text style={styles.sectionTitle}>Start with the next standout event</Text>
              <Text style={styles.copy}>
                The first card carries the strongest browse context so new users can understand the
                event quickly on a phone.
              </Text>
            </View>
            <EventCard
              description={featuredEvent.description ?? "Open the event to view timing, venue, and ticket context."}
              href={{
                pathname: "/(public)/events/[slug]",
                params: { slug: featuredEvent.slug },
              }}
              meta={`${featuredEvent.scheduleLabel} · ${featuredEvent.venueLabel}`}
              title={featuredEvent.title}
            />
          </>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && moreEvents.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Upcoming</Text>
              <Text style={styles.sectionTitle}>More events worth opening</Text>
            </View>
            <View style={styles.stack}>
              {moreEvents.map((event) => (
                <EventCard
                  key={event.id}
                  description={event.description ?? "Open the event to see details and ticket availability."}
                  href={{
                    pathname: "/(public)/events/[slug]",
                    params: { slug: event.slug },
                  }}
                  meta={`${event.scheduleLabel} · ${event.venueLabel}`}
                  title={event.title}
                />
              ))}
            </View>
          </>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>No public events live yet</Text>
            <Text style={styles.copy}>
              The mobile discovery surface is ready. As soon as the next event is published, it will
              appear here.
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>What happens after sign-in?</Text>
          <Text style={styles.copy}>
            Wallet stays your home for owned tickets, activity, transfers, and event access. Public
            discovery simply gives new users a better way into the product.
          </Text>
          {session ? (
            <Link href="/(tabs)/wallet" style={styles.footerLink}>
              Return to wallet
            </Link>
          ) : (
            <Link href="/(auth)/login" style={styles.footerLink}>
              Sign in instead
            </Link>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardEyebrow: {
    color: palette.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cardMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
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
  footerLink: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "700",
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
  linkReset: {
    textDecorationLine: "none",
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
