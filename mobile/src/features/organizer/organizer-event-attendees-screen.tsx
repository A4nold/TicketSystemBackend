import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/formatters";
import { getOrganizerEventBySlug } from "@/lib/organizer/events-client";
import {
  listOrganizerEventAttendees,
  type OrganizerEventAttendee,
} from "@/lib/organizer/attendees-client";
import { palette } from "@/styles/theme";

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatPersonName(input: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();

  return fullName || input.email;
}

export function OrganizerEventAttendeesScreen() {
  const { eventId: routeEventId, slug, title } = useLocalSearchParams<{
    eventId?: string;
    slug: string;
    title?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "CHECKED_IN" | "ACTIVE" | "REFUNDED"
  >("ALL");
  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const eventQuery = useQuery({
    enabled: Boolean(session?.accessToken && slug && !routeEventId && hasSurfaceAccess),
    queryFn: () => getOrganizerEventBySlug(slug, session!.accessToken),
    queryKey: ["organizer-event-detail", slug, session?.accessToken],
  });

  const resolvedEventId = routeEventId ?? eventQuery.data?.id ?? null;
  const resolvedTitle = title ?? eventQuery.data?.title ?? "Attendees";

  const attendeesQuery = useInfiniteQuery({
    enabled: Boolean(session?.accessToken && resolvedEventId && hasSurfaceAccess),
    queryFn: ({ pageParam }) =>
      listOrganizerEventAttendees(resolvedEventId!, session!.accessToken, {
        checkInStatus:
          statusFilter === "CHECKED_IN" ? "CHECKED_IN" : undefined,
        cursor: pageParam,
        limit: 20,
        search: debouncedSearch || undefined,
        state:
          statusFilter === "ACTIVE"
            ? "ACTIVE"
            : statusFilter === "REFUNDED"
              ? "REFUNDED"
              : undefined,
      }),
    queryKey: [
      "organizer-event-attendees",
      resolvedEventId,
      session?.accessToken,
      debouncedSearch,
      statusFilter,
    ],
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const attendeeItems = useMemo(
    () => attendeesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [attendeesQuery.data],
  );
  const summary = attendeesQuery.data?.pages[0]?.summary ?? null;

  return (
    <Screen
      title="Attendees"
      subtitle={resolvedTitle}
      compactHeader
    >
      <ScrollView contentContainerStyle={styles.content}>
        {!hasSurfaceAccess ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer access isn't available</Text>
              <Text style={styles.copy}>This account does not have organizer access.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && (eventQuery.isLoading || attendeesQuery.isLoading) ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading attendees</Text>
              <Text style={styles.copy}>Pulling the latest attendee list for this event.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && (eventQuery.isError || attendeesQuery.isError) ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Attendees couldn't be loaded</Text>
              <Text style={styles.copy}>
                {getErrorText(
                  eventQuery.error ?? attendeesQuery.error,
                  "Try again in a moment.",
                )}
              </Text>
              <ActionButton
                onPress={() => {
                  void eventQuery.refetch();
                  void attendeesQuery.refetch();
                }}
                title="Retry attendees"
              />
            </View>
          </Card>
        ) : null}

        {summary ? (
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Event ops</Text>
              <Text style={styles.heroTitle}>{resolvedTitle}</Text>
              <Text style={styles.heroCopy}>Search ticket holders and check live entry status.</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total</Text>
                  <Text style={styles.metricValue}>{summary.totalCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Checked in</Text>
                  <Text style={styles.metricValue}>{summary.checkedInCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Active</Text>
                  <Text style={styles.metricValue}>{summary.activeCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Refunded</Text>
                  <Text style={styles.metricValue}>{summary.refundedCount}</Text>
                </View>
              </View>
            </View>
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Search attendees</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchInput}
              placeholder="Search holder, purchaser, serial, or ticket type"
              placeholderTextColor={palette.muted}
              style={styles.searchInput}
              value={searchInput}
            />
            <Text style={styles.hintText}>
              Search by attendee, purchaser, serial number, or ticket type name.
            </Text>
            <View style={styles.filterRow}>
              {(["ALL", "CHECKED_IN", "ACTIVE", "REFUNDED"] as const).map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  style={[
                    styles.filterChip,
                    statusFilter === filter ? styles.filterChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === filter ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {filter === "ALL"
                      ? "All"
                      : filter === "CHECKED_IN"
                        ? "Checked in"
                        : filter === "ACTIVE"
                          ? "Active"
                          : "Refunded"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {summary && attendeeItems.length === 0 && !attendeesQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>No attendees matched</Text>
              <Text style={styles.copy}>
                {debouncedSearch
                  ? "Try a different search term."
                  : "No attendees have been issued for this event yet."}
              </Text>
            </View>
          </Card>
        ) : null}

        {attendeeItems.map((attendee) => (
          <AttendeeCard
            key={attendee.ticketId}
            attendee={attendee}
            onPress={() => {
              router.push(
                {
                  params: {
                    eventId: resolvedEventId!,
                    slug,
                    serialNumber: attendee.serialNumber,
                  },
                  pathname: "/organizer/[slug]/attendees/[serialNumber]",
                } as never,
              );
            }}
          />
        ))}

        {attendeesQuery.hasNextPage ? (
          <ActionButton
            loading={attendeesQuery.isFetchingNextPage}
            onPress={() => void attendeesQuery.fetchNextPage()}
            title="Load more attendees"
            variant="secondary"
          />
        ) : null}

        {attendeesQuery.isFetching && !attendeesQuery.isLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={palette.ink} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function AttendeeCard({
  attendee,
  onPress,
}: {
  attendee: OrganizerEventAttendee;
  onPress: () => void;
}) {
  const statusTone = attendee.checkedIn ? styles.statusSuccess : styles.statusNeutral;

  return (
    <Pressable onPress={onPress}>
      <Card padded={false}>
        <View style={styles.sectionShell}>
        <View style={styles.attendeeHeader}>
          <View style={styles.attendeeIdentity}>
            <Text style={styles.attendeeName}>{formatPersonName(attendee.holder)}</Text>
            <Text style={styles.attendeeEmail}>{attendee.holder.email}</Text>
          </View>
          <View style={[styles.statusPill, statusTone]}>
            <Text style={styles.statusPillText}>
              {attendee.checkedIn ? "Checked in" : attendee.ticketStatus}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ticket</Text>
          <Text style={styles.infoValue}>
            {attendee.ticketType.name} · {attendee.serialNumber}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Purchased</Text>
          <Text style={styles.infoValue}>{formatDateTime(attendee.purchaseDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Purchaser</Text>
          <Text style={styles.infoValue}>{formatPersonName(attendee.purchaser)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Check-in</Text>
          <Text style={styles.infoValue}>
            {attendee.checkedInAt ? formatDateTime(attendee.checkedInAt) : "Not checked in yet"}
          </Text>
        </View>
          <Text style={styles.drilldownHint}>Open attendee detail</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  attendeeEmail: {
    color: palette.muted,
    fontSize: 14,
  },
  attendeeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  attendeeIdentity: {
    flex: 1,
    gap: 2,
  },
  attendeeName: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  copy: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  drilldownHint: {
    color: palette.accentDeep,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#d6c7b8",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  filterChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroCopy: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  heroEyebrow: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroShell: {
    gap: 16,
    padding: 20,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  hintText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    width: 86,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoValue: {
    color: palette.ink,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  inlineLoading: {
    alignItems: "center",
    paddingVertical: 8,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2d6c8",
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "47%",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  searchInput: {
    backgroundColor: "#fffdf8",
    borderColor: "#d6c7b8",
    borderRadius: 22,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionShell: {
    gap: 12,
    padding: 20,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  statusNeutral: {
    backgroundColor: "#f3eadf",
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  statusSuccess: {
    backgroundColor: "#dcefdc",
  },
});
