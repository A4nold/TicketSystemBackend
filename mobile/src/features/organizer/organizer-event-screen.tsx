import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { ActionButton, Card, Screen } from "@/components/ui";
import { hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import {
  blankTicketTypeEditorState,
  buildOrganizerEventPatch,
  buildTicketTypePayload,
  getStaffStatusCopy,
  toEventEditorState,
  toTicketTypeEditorState,
  validateEventEditorState,
  validateStaffInvite,
  validateTicketTypeEditorState,
  type EventEditorState,
  type TicketTypeEditorState,
} from "@/features/organizer/organizer-model";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/formatters";
import {
  createOrganizerTicketType,
  getOrganizerEventBySlug,
  getOrganizerManageableEventIds,
  inviteOrganizerStaff,
  listOrganizerEvents,
  listOrganizerStaff,
  revokeOrganizerStaff,
  updateOrganizerEvent,
  updateOrganizerStaffRole,
  updateOrganizerTicketType,
} from "@/lib/organizer/events-client";
import { palette } from "@/styles/theme";

const STATUS_OPTIONS: EventEditorState["status"][] = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
];
const STAFF_ROLE_OPTIONS = ["ADMIN", "SCANNER"] as const;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function Field({
  compact = false,
  error,
  hint,
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  compact?: boolean;
  error?: string;
  hint?: string;
  keyboardType?: "default" | "email-address" | "numeric";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={[
          styles.input,
          compact ? styles.inputCompact : null,
          multiline ? styles.textArea : null,
          error ? styles.inputError : null,
        ]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: {
  onSelect: (value: T) => void;
  options: readonly T[];
  selected: T;
}) {
  return (
    <View style={styles.segmentedWrap}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={[
            styles.segmentChip,
            selected === option ? styles.segmentChipActive : null,
          ]}
        >
          <Text
            style={[
              styles.segmentChipText,
              selected === option ? styles.segmentChipTextActive : null,
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  status,
  expanded,
  onToggle,
  children,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  status?: "attention" | "default" | "saving" | "saved";
  subtitle: string;
  title: string;
}) {
  return (
    <Card padded={false}>
      <View style={styles.sectionShell}>
        <Pressable onPress={onToggle} style={styles.sectionHeaderButton}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.copy}>{subtitle}</Text>
          </View>
          <View style={styles.sectionHeaderMeta}>
            {status ? (
              <View
                style={[
                  styles.sectionStatePill,
                  status === "attention" ? styles.sectionStateAttention : null,
                  status === "saving" ? styles.sectionStateSaving : null,
                  status === "saved" ? styles.sectionStateSaved : null,
                ]}
              >
                <Text
                  style={[
                    styles.sectionStatePillText,
                    status === "attention" ? styles.sectionStateAttentionText : null,
                    status === "saving" ? styles.sectionStateSavingText : null,
                    status === "saved" ? styles.sectionStateSavedText : null,
                  ]}
                >
                  {status === "attention"
                    ? "Needs review"
                    : status === "saving"
                      ? "Saving"
                      : status === "saved"
                        ? "Saved"
                        : "Ready"}
                </Text>
              </View>
            ) : null}
            <Text style={styles.sectionChevron}>{expanded ? "Hide" : "Open"}</Text>
          </View>
        </Pressable>

        {expanded ? children : null}
      </View>
    </Card>
  );
}

export function OrganizerEventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [eventForm, setEventForm] = useState<EventEditorState | null>(null);
  const [ticketTypeForm, setTicketTypeForm] = useState<TicketTypeEditorState>(
    blankTicketTypeEditorState(),
  );
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>("new");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "SCANNER">("SCANNER");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingTicketType, setIsSavingTicketType] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    event: true,
    staff: false,
    ticketTypes: false,
  });

  const hasSurfaceAccess = hasOrganizerSurfaceAccess(session?.user);
  const manageableEventIds = getOrganizerManageableEventIds(session?.user.memberships ?? []);
  const eventsQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => listOrganizerEvents(session!.accessToken),
    queryKey: ["organizer-events", session?.accessToken],
  });

  const selectedSummary = useMemo(() => {
    const manageableEvents = (eventsQuery.data ?? []).filter((event) =>
      manageableEventIds.includes(event.id),
    );

    return manageableEvents.find((event) => event.slug === slug) ?? null;
  }, [eventsQuery.data, manageableEventIds, slug]);
  const eventValidation = eventForm ? validateEventEditorState(eventForm) : null;
  const ticketTypeValidation = validateTicketTypeEditorState(ticketTypeForm);
  const staffInviteValidation = validateStaffInvite(inviteEmail);

  const eventDetailQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedSummary),
    queryFn: () => getOrganizerEventBySlug(selectedSummary!.slug, session!.accessToken),
    queryKey: ["organizer-event-detail", selectedSummary?.slug, session?.accessToken],
  });
  const staffQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedSummary),
    queryFn: () => listOrganizerStaff(selectedSummary!.id, session!.accessToken),
    queryKey: ["organizer-staff", selectedSummary?.id, session?.accessToken],
  });
  const pristineEventForm = eventDetailQuery.data ? toEventEditorState(eventDetailQuery.data) : null;
  const pristineTicketTypeForm = useMemo(() => {
    const currentTicketType = eventDetailQuery.data?.ticketTypes.find(
      (ticketType) => ticketType.id === selectedTicketTypeId,
    );

    return currentTicketType
      ? toTicketTypeEditorState(currentTicketType)
      : blankTicketTypeEditorState();
  }, [eventDetailQuery.data?.ticketTypes, selectedTicketTypeId]);
  const eventIsDirty = Boolean(
    eventForm &&
      pristineEventForm &&
      JSON.stringify(eventForm) !== JSON.stringify(pristineEventForm),
  );
  const ticketTypeIsDirty =
    JSON.stringify(ticketTypeForm) !== JSON.stringify(pristineTicketTypeForm);
  const staffIsDirty = Boolean(inviteEmail.trim());
  const stickyAction = useMemo(() => {
    if (expandedSections.event && eventIsDirty) {
      return {
        disabled: !eventValidation?.isValid || isSavingEvent,
        label: eventValidation?.isValid ? "Save event details" : "Complete event details",
        onPress: () => void handleEventSave(),
        subtitle: "Unsaved event changes",
      };
    }

    if (expandedSections.ticketTypes && ticketTypeIsDirty) {
      return {
        disabled: !ticketTypeValidation.isValid || isSavingTicketType,
        label:
          selectedTicketTypeId === "new"
            ? ticketTypeValidation.isValid
              ? "Create ticket type"
              : "Complete ticket type"
            : ticketTypeValidation.isValid
              ? "Save ticket type"
              : "Complete ticket type",
        onPress: () => void handleTicketTypeSave(),
        subtitle: "Unsaved ticket type changes",
      };
    }

    if (expandedSections.staff && staffIsDirty) {
      return {
        disabled: !staffInviteValidation.isValid || isSavingStaff,
        label: staffInviteValidation.isValid ? "Send staff invite" : "Complete staff invite",
        onPress: () => void handleInviteStaff(),
        subtitle: "Invite ready to send",
      };
    }

    if (eventIsDirty) {
      return {
        disabled: !eventValidation?.isValid || isSavingEvent,
        label: eventValidation?.isValid ? "Review event changes" : "Complete event details",
        onPress: () => {
          animateLayout();
          setExpandedSections((current) => ({ ...current, event: true }));
        },
        subtitle: "Unsaved event changes",
      };
    }

    if (ticketTypeIsDirty) {
      return {
        disabled: !ticketTypeValidation.isValid || isSavingTicketType,
        label: ticketTypeValidation.isValid ? "Review ticket type" : "Complete ticket type",
        onPress: () => {
          animateLayout();
          setExpandedSections((current) => ({ ...current, ticketTypes: true }));
        },
        subtitle: "Unsaved ticket type changes",
      };
    }

    if (staffIsDirty) {
      return {
        disabled: !staffInviteValidation.isValid || isSavingStaff,
        label: staffInviteValidation.isValid ? "Review staff invite" : "Complete staff invite",
        onPress: () => {
          animateLayout();
          setExpandedSections((current) => ({ ...current, staff: true }));
        },
        subtitle: "Invite ready to send",
      };
    }

    return null;
  }, [
    eventIsDirty,
    eventValidation?.isValid,
    expandedSections.event,
    expandedSections.staff,
    expandedSections.ticketTypes,
    isSavingEvent,
    isSavingStaff,
    isSavingTicketType,
    selectedTicketTypeId,
    staffInviteValidation.isValid,
    staffIsDirty,
    ticketTypeIsDirty,
    ticketTypeValidation.isValid,
  ]);

  useEffect(() => {
    if (eventDetailQuery.data) {
      setEventForm(toEventEditorState(eventDetailQuery.data));
      setSelectedTicketTypeId(eventDetailQuery.data.ticketTypes[0]?.id ?? "new");
      setNotice(null);
      setErrorMessage(null);
    }
  }, [eventDetailQuery.data?.id]);

  useEffect(() => {
    const currentTicketType = eventDetailQuery.data?.ticketTypes.find(
      (ticketType) => ticketType.id === selectedTicketTypeId,
    );

    if (currentTicketType) {
      setTicketTypeForm(toTicketTypeEditorState(currentTicketType));
      return;
    }

    setTicketTypeForm(blankTicketTypeEditorState());
  }, [eventDetailQuery.data?.ticketTypes, selectedTicketTypeId]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => {
      animateLayout();
      setNotice(null);
    }, 2600);

    return () => clearTimeout(timer);
  }, [notice]);

  async function refreshOrganizerQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["organizer-events", session?.accessToken] }),
      queryClient.invalidateQueries({
        queryKey: ["organizer-event-detail", selectedSummary?.slug, session?.accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["organizer-staff", selectedSummary?.id, session?.accessToken],
      }),
    ]);
  }

  async function handleEventSave() {
    if (!session?.accessToken || !selectedSummary || !eventForm || !eventValidation?.isValid) {
      return;
    }

    setIsSavingEvent(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await updateOrganizerEvent(
        selectedSummary.id,
        buildOrganizerEventPatch(eventForm),
        session.accessToken,
      );
      await refreshOrganizerQueries();
      setNotice("Event details saved.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Event details couldn't be saved right now."));
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleTicketTypeSave() {
    if (!session?.accessToken || !selectedSummary || !ticketTypeValidation.isValid) {
      return;
    }

    setIsSavingTicketType(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      if (selectedTicketTypeId !== "new") {
        await updateOrganizerTicketType(
          selectedSummary.id,
          selectedTicketTypeId,
          buildTicketTypePayload(ticketTypeForm),
          session.accessToken,
        );
        setNotice("Ticket type updated.");
      } else {
        const created = await createOrganizerTicketType(
          selectedSummary.id,
          buildTicketTypePayload(ticketTypeForm),
          session.accessToken,
        );
        setSelectedTicketTypeId(created.id);
        setNotice("Ticket type created.");
      }

      await refreshOrganizerQueries();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Ticket type changes couldn't be saved right now."));
    } finally {
      setIsSavingTicketType(false);
    }
  }

  async function handleInviteStaff() {
    if (
      !session?.accessToken ||
      !selectedSummary ||
      !inviteEmail.trim() ||
      !staffInviteValidation.isValid
    ) {
      return;
    }

    setIsSavingStaff(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await inviteOrganizerStaff(
        selectedSummary.id,
        {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
        session.accessToken,
      );
      setInviteEmail("");
      await refreshOrganizerQueries();
      setNotice("Staff invite sent.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Staff invite couldn't be sent right now."));
    } finally {
      setIsSavingStaff(false);
    }
  }

  async function handleStaffRoleChange(membershipId: string, role: "ADMIN" | "SCANNER") {
    if (!session?.accessToken || !selectedSummary) {
      return;
    }

    setIsSavingStaff(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await updateOrganizerStaffRole(
        selectedSummary.id,
        membershipId,
        { role },
        session.accessToken,
      );
      await refreshOrganizerQueries();
      setNotice("Staff role updated.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Staff role couldn't be updated right now."));
    } finally {
      setIsSavingStaff(false);
    }
  }

  async function handleStaffRevoke(membershipId: string) {
    if (!session?.accessToken || !selectedSummary) {
      return;
    }

    setIsSavingStaff(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await revokeOrganizerStaff(selectedSummary.id, membershipId, session.accessToken);
      await refreshOrganizerQueries();
      setNotice("Staff access revoked.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Staff access couldn't be revoked right now."));
    } finally {
      setIsSavingStaff(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/organizer" as never);
  }

  function toggleSection(section: "event" | "staff" | "ticketTypes") {
    animateLayout();
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <Screen
      title="Event"
      subtitle="Make fast updates to event details, ticket inventory, and staff access."
    >
      <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.backRow}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to organizer</Text>
          </Pressable>
        </View>

        {!hasSurfaceAccess ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer access isn't available</Text>
              <Text style={styles.copy}>
                This account can use the attendee experience, but it does not have organizer mobile
                access.
              </Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && eventsQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading event</Text>
              <Text style={styles.copy}>Checking your organizer access for this event.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && !eventsQuery.isLoading && !selectedSummary ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>This event isn't manageable here</Text>
              <Text style={styles.copy}>
                The event could not be found in your accepted owner or admin memberships.
              </Text>
            </View>
          </Card>
        ) : null}

        {selectedSummary ? (
          <Card tone="accent" padded={false}>
            <View style={styles.heroShell}>
              <Text style={styles.heroEyebrow}>Selected event</Text>
              <Text style={styles.heroTitle}>{selectedSummary.title}</Text>
              <Text style={styles.heroCopy}>
                {formatDateTime(selectedSummary.startsAt)}
                {selectedSummary.venueName ? ` · ${selectedSummary.venueName}` : ""}
              </Text>

              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Issued</Text>
                  <Text style={styles.metricValue}>{selectedSummary.issuedTicketsCount}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Ticket types</Text>
                  <Text style={styles.metricValue}>{selectedSummary.ticketTypes.length}</Text>
                </View>
              </View>
            </View>
          </Card>
        ) : null}

        {notice ? (
          <Card tone="success" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.flashTitle}>Saved</Text>
              <Text style={styles.copy}>{notice}</Text>
            </View>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.flashTitle}>Action needed</Text>
              <Text style={styles.copy}>{errorMessage}</Text>
            </View>
          </Card>
        ) : null}

        {eventDetailQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading event detail</Text>
              <Text style={styles.copy}>Pulling the latest event setup and ticket type data.</Text>
            </View>
          </Card>
        ) : null}

        {eventForm && eventDetailQuery.data ? (
          <>
            <SectionCard
              expanded={expandedSections.event}
              onToggle={() => toggleSection("event")}
              status={
                isSavingEvent
                  ? "saving"
                  : eventIsDirty || !eventValidation?.isValid
                    ? "attention"
                    : notice === "Event details saved."
                      ? "saved"
                      : "default"
              }
              subtitle="Keep the headline details current so attendees and staff see the right information."
              title="Core event details"
            >
                {!eventValidation?.isValid ? (
                  <View style={styles.inlineNotice}>
                    <Text style={styles.inlineNoticeTitle}>
                      Complete the required fields before saving.
                    </Text>
                  </View>
                ) : null}

                <Field
                  error={eventValidation?.fieldErrors.title}
                  label="Event title"
                  onChangeText={(value) => setEventForm((current) => (current ? { ...current, title: value } : current))}
                  value={eventForm.title}
                />
                <Field
                  hint="A short summary for the event page."
                  label="Description"
                  multiline
                  onChangeText={(value) =>
                    setEventForm((current) => (current ? { ...current, description: value } : current))
                  }
                  placeholder="What makes this event worth showing up for?"
                  value={eventForm.description}
                />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      label="Venue"
                      onChangeText={(value) =>
                        setEventForm((current) => (current ? { ...current, venueName: value } : current))
                      }
                      value={eventForm.venueName}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={eventValidation?.fieldErrors.timezone}
                      label="Timezone"
                      onChangeText={(value) =>
                        setEventForm((current) => (current ? { ...current, timezone: value } : current))
                      }
                      placeholder="Europe/Dublin"
                      value={eventForm.timezone}
                    />
                  </View>
                </View>
                <Field
                  compact
                  label="Venue address"
                  onChangeText={(value) =>
                    setEventForm((current) => (current ? { ...current, venueAddress: value } : current))
                  }
                  value={eventForm.venueAddress}
                />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={eventValidation?.fieldErrors.startsAt}
                      hint="Use local date and time."
                      label="Starts"
                      onChangeText={(value) =>
                        setEventForm((current) => (current ? { ...current, startsAt: value } : current))
                      }
                      placeholder="YYYY-MM-DDTHH:mm"
                      value={eventForm.startsAt}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={eventValidation?.fieldErrors.endsAt}
                      label="Ends"
                      onChangeText={(value) =>
                        setEventForm((current) => (current ? { ...current, endsAt: value } : current))
                      }
                      placeholder="YYYY-MM-DDTHH:mm"
                      value={eventForm.endsAt}
                    />
                  </View>
                </View>
                <Field
                  compact
                  error={eventValidation?.fieldErrors.slug}
                  label="Slug"
                  onChangeText={(value) =>
                    setEventForm((current) => (current ? { ...current, slug: value } : current))
                  }
                  value={eventForm.slug}
                />

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <SegmentedControl
                    onSelect={(value) =>
                      setEventForm((current) => (current ? { ...current, status: value } : current))
                    }
                    options={STATUS_OPTIONS}
                    selected={eventForm.status}
                  />
                </View>

                <ActionButton
                  disabled={!eventValidation?.isValid}
                  loading={isSavingEvent}
                  onPress={() => void handleEventSave()}
                  title={eventIsDirty ? "Save details" : "Details up to date"}
                />
            </SectionCard>

            <SectionCard
              expanded={expandedSections.ticketTypes}
              onToggle={() => toggleSection("ticketTypes")}
              status={
                isSavingTicketType
                  ? "saving"
                  : ticketTypeIsDirty
                    ? "attention"
                    : notice === "Ticket type updated." || notice === "Ticket type created."
                      ? "saved"
                      : "default"
              }
              subtitle="Keep pricing and inventory aligned with what is live right now."
              title="Ticket types"
            >
                {!ticketTypeValidation.isValid ? (
                  <View style={styles.inlineNotice}>
                    <Text style={styles.inlineNoticeTitle}>
                      Ticket type details still need attention.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.segmentedWrap}>
                  {eventDetailQuery.data.ticketTypes.map((ticketType) => (
                    <Pressable
                      key={ticketType.id}
                      onPress={() => setSelectedTicketTypeId(ticketType.id)}
                      style={[
                        styles.segmentChip,
                        selectedTicketTypeId === ticketType.id ? styles.segmentChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          selectedTicketTypeId === ticketType.id
                            ? styles.segmentChipTextActive
                            : null,
                        ]}
                      >
                        {ticketType.name}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setSelectedTicketTypeId("new")}
                    style={[
                      styles.segmentChip,
                      selectedTicketTypeId === "new" ? styles.segmentChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentChipText,
                        selectedTicketTypeId === "new" ? styles.segmentChipTextActive : null,
                      ]}
                    >
                      New ticket type
                    </Text>
                  </Pressable>
                </View>

                <Field
                  compact
                  error={ticketTypeValidation.fieldErrors.name}
                  label="Name"
                  onChangeText={(value) => setTicketTypeForm((current) => ({ ...current, name: value }))}
                  value={ticketTypeForm.name}
                />
                <Field
                  compact
                  hint="Optional attendee-facing description."
                  label="Description"
                  multiline
                  onChangeText={(value) =>
                    setTicketTypeForm((current) => ({ ...current, description: value }))
                  }
                  value={ticketTypeForm.description}
                />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={ticketTypeValidation.fieldErrors.price}
                      label="Price"
                      keyboardType="numeric"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, price: value }))
                      }
                      placeholder="15.00"
                      value={ticketTypeForm.price}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={ticketTypeValidation.fieldErrors.quantity}
                      label="Quantity"
                      keyboardType="numeric"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, quantity: value }))
                      }
                      placeholder="100"
                      value={ticketTypeForm.quantity}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      label="Currency"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, currency: value }))
                      }
                      value={ticketTypeForm.currency}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={ticketTypeValidation.fieldErrors.maxPerOrder}
                      label="Max per order"
                      keyboardType="numeric"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, maxPerOrder: value }))
                      }
                      value={ticketTypeForm.maxPerOrder}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={ticketTypeValidation.fieldErrors.saleStartsAt}
                      label="Sale starts"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, saleStartsAt: value }))
                      }
                      placeholder="YYYY-MM-DDTHH:mm"
                      value={ticketTypeForm.saleStartsAt}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <Field
                      compact
                      error={ticketTypeValidation.fieldErrors.saleEndsAt}
                      label="Sale ends"
                      onChangeText={(value) =>
                        setTicketTypeForm((current) => ({ ...current, saleEndsAt: value }))
                      }
                      placeholder="YYYY-MM-DDTHH:mm"
                      value={ticketTypeForm.saleEndsAt}
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.fieldLabel}>Ticket type active</Text>
                    <Text style={styles.copy}>Inactive ticket types stay visible here but stop selling.</Text>
                  </View>
                  <Switch
                    onValueChange={(value) =>
                      setTicketTypeForm((current) => ({ ...current, isActive: value }))
                    }
                    trackColor={{ false: "#d9c7b4", true: "#d0b08f" }}
                    thumbColor={ticketTypeForm.isActive ? palette.accentDeep : "#ffffff"}
                    value={ticketTypeForm.isActive}
                  />
                </View>

                <ActionButton
                  disabled={!ticketTypeValidation.isValid}
                  loading={isSavingTicketType}
                  onPress={() => void handleTicketTypeSave()}
                  title={
                    selectedTicketTypeId === "new"
                      ? "Create ticket type"
                      : ticketTypeIsDirty
                        ? "Save ticket type"
                        : "Ticket type up to date"
                  }
                />
            </SectionCard>

            <SectionCard
              expanded={expandedSections.staff}
              onToggle={() => toggleSection("staff")}
              status={
                isSavingStaff
                  ? "saving"
                  : staffIsDirty
                    ? "attention"
                    : notice === "Staff invite sent." ||
                        notice === "Staff role updated." ||
                        notice === "Staff access revoked."
                      ? "saved"
                      : "default"
              }
              subtitle="Keep the event team current and make role changes without leaving mobile."
              title="Staff management"
            >

                <Field
                  compact
                  error={staffInviteValidation.fieldErrors.email}
                  hint="Invites can be sent to admins or scanners."
                  keyboardType="email-address"
                  label="Invite by email"
                  onChangeText={setInviteEmail}
                  placeholder="staff@example.com"
                  value={inviteEmail}
                />

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Invite role</Text>
                  <SegmentedControl
                    onSelect={setInviteRole}
                    options={STAFF_ROLE_OPTIONS}
                    selected={inviteRole}
                  />
                </View>

                <ActionButton
                  disabled={!staffInviteValidation.isValid}
                  loading={isSavingStaff}
                  onPress={() => void handleInviteStaff()}
                  title={inviteEmail.trim() ? "Send invite" : "Ready to invite"}
                />

                {(staffQuery.data ?? eventDetailQuery.data.staff).map((membership) => (
                  <View key={membership.id} style={styles.staffCard}>
                    <View style={styles.staffHeader}>
                      <View style={styles.staffCopy}>
                        <Text style={styles.staffName}>
                          {membership.user.firstName || membership.user.lastName
                            ? `${membership.user.firstName ?? ""} ${membership.user.lastName ?? ""}`.trim()
                            : membership.user.email}
                        </Text>
                        <Text style={styles.copy}>{membership.user.email}</Text>
                      </View>
                      <View style={styles.neutralPill}>
                        <Text style={styles.neutralPillText}>
                          {getStaffStatusCopy(membership.acceptedAt)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.staffMeta}>
                      Current role: {membership.role}
                      {membership.invitedAt ? ` · invited ${formatDateTime(membership.invitedAt)}` : ""}
                    </Text>

                    {membership.role !== "OWNER" ? (
                      <View style={styles.actionRow}>
                        {STAFF_ROLE_OPTIONS.map((role) => (
                          <Pressable
                            key={role}
                            onPress={() => void handleStaffRoleChange(membership.id, role)}
                            style={[
                              styles.inlineAction,
                              membership.role === role ? styles.inlineActionActive : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.inlineActionText,
                                membership.role === role ? styles.inlineActionTextActive : null,
                              ]}
                            >
                              Make {role}
                            </Text>
                          </Pressable>
                        ))}
                        <Pressable
                          onPress={() => void handleStaffRevoke(membership.id)}
                          style={styles.inlineAction}
                        >
                          <Text style={styles.inlineDangerText}>Revoke</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
            </SectionCard>
          </>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {stickyAction ? (
        <View style={styles.stickyBarShell}>
          <View style={styles.stickyBar}>
            <View style={styles.stickyCopy}>
              <Text style={styles.stickyTitle}>{stickyAction.subtitle}</Text>
              <Text style={styles.stickyHint}>
                {stickyAction.disabled
                  ? "Finish the required fields to continue."
                  : "You can save this section now."}
              </Text>
            </View>
            <View style={styles.stickyActionWrap}>
              <ActionButton
                disabled={stickyAction.disabled}
                onPress={stickyAction.onPress}
                title={stickyAction.label}
              />
            </View>
          </View>
        </View>
      ) : null}
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  backRow: {
    alignItems: "flex-start",
  },
  bottomSpacer: {
    height: 100,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  flashTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    opacity: 0.9,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
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
  stickyActionWrap: {
    minWidth: 180,
  },
  stickyBar: {
    backgroundColor: palette.glass,
    borderColor: palette.divider,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    shadowColor: palette.black,
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  stickyBarShell: {
    backgroundColor: "transparent",
    bottom: 12,
    left: 16,
    position: "absolute",
    right: 16,
  },
  stickyCopy: {
    gap: 4,
  },
  stickyHint: {
    color: palette.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  stickyTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  inlineAction: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inlineActionActive: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  inlineActionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  inlineActionTextActive: {
    color: palette.accentDeep,
  },
  inlineDangerText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  hintText: {
    color: palette.mutedSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputCompact: {
    borderRadius: 16,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: palette.danger,
  },
  inlineNotice: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineNoticeTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
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
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metricValue: {
    color: palette.white,
    fontSize: 20,
    fontWeight: "700",
  },
  neutralPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  neutralPillText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  sectionChevron: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionHeaderButton: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sectionHeaderMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  sectionStateAttention: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
  },
  sectionStateAttentionText: {
    color: palette.warning,
  },
  sectionStateDefault: {},
  sectionStatePill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionStatePillText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionStateSaved: {
    backgroundColor: palette.successSoft,
    borderColor: "#b8d9ca",
  },
  sectionStateSavedText: {
    color: palette.successDeep,
  },
  sectionStateSaving: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  sectionStateSavingText: {
    color: palette.accentDeep,
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  segmentedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  segmentChip: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentChipActive: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  segmentChipText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  segmentChipTextActive: {
    color: palette.accentDeep,
  },
  staffCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  staffCopy: {
    flex: 1,
    gap: 4,
  },
  staffHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  staffMeta: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  staffName: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  textArea: {
    minHeight: 108,
    textAlignVertical: "top",
  },
});
