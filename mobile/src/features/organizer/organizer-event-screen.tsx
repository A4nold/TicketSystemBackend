import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
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
import { CollapsibleSection } from "@/components/section-primitives";
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
  removeOrganizerEventHeaderMedia,
  revokeOrganizerStaff,
  uploadOrganizerEventHeaderMedia,
  updateOrganizerEvent,
  updateOrganizerStaffRole,
  updateOrganizerTicketType,
} from "@/lib/organizer/events-client";
import {
  acceptOrganizerOffer,
  listOrganizerOffers,
  rejectOrganizerOffer,
} from "@/lib/organizer/offers-client";
import { palette } from "@/styles/theme";

const STATUS_OPTIONS: EventEditorState["status"][] = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
];
const CURRENCY_OPTIONS: EventEditorState["currency"][] = ["EUR", "NGN"];
const STAFF_ROLE_OPTIONS = ["ADMIN", "SCANNER"] as const;
const TICKET_PRICING_MODE_OPTIONS = ["FIXED", "FREE", "OFFER_RANGE"] as const;
const OFFER_STATUS_OPTIONS = ["PENDING", "ACCEPTED", "REJECTED"] as const;

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
  const [offerStatusFilter, setOfferStatusFilter] = useState<"PENDING" | "ACCEPTED" | "REJECTED">("PENDING");
  const [offerNoteDrafts, setOfferNoteDrafts] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "SCANNER">("SCANNER");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isSavingTicketType, setIsSavingTicketType] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingOffers, setIsSavingOffers] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    event: false,
    offers: false,
    staff: false,
    ticketTypes: true,
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
  const offersQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedSummary),
    queryFn: () =>
      listOrganizerOffers(
        selectedSummary!.id,
        session!.accessToken,
        offerStatusFilter,
      ),
    queryKey: ["organizer-offers", selectedSummary?.id, session?.accessToken, offerStatusFilter],
  });
  const pristineEventForm = eventDetailQuery.data ? toEventEditorState(eventDetailQuery.data) : null;
  const pristineTicketTypeForm = useMemo(() => {
    const currentTicketType = eventDetailQuery.data?.ticketTypes.find(
      (ticketType) => ticketType.id === selectedTicketTypeId,
    );

    return currentTicketType
      ? toTicketTypeEditorState(currentTicketType)
      : {
          ...blankTicketTypeEditorState(),
          currency: eventDetailQuery.data?.currency ?? "EUR",
        };
  }, [eventDetailQuery.data?.currency, eventDetailQuery.data?.ticketTypes, selectedTicketTypeId]);
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

    setTicketTypeForm({
      ...blankTicketTypeEditorState(),
      currency: eventDetailQuery.data?.currency ?? "EUR",
    });
  }, [eventDetailQuery.data?.currency, eventDetailQuery.data?.ticketTypes, selectedTicketTypeId]);

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

  async function handleUploadHeaderMedia() {
    if (!session?.accessToken || !selectedSummary || !eventForm) {
      return;
    }

    setIsSavingMedia(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const selectedAsset = result.assets[0];
      const selectedMimeType = (selectedAsset.mimeType ?? "").toLowerCase();
      const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      const isHeic =
        selectedMimeType.includes("heic") || selectedMimeType.includes("heif");

      if (isHeic || (selectedMimeType && !supportedMimeTypes.has(selectedMimeType))) {
        setErrorMessage(
          "Unsupported image format. Please choose JPEG, PNG, or WEBP.",
        );
        return;
      }

      if (typeof selectedAsset.fileSize === "number" && selectedAsset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage("Image must be 5MB or smaller.");
        return;
      }

      // Show immediate local preview while upload completes.
      setEventForm((current) =>
        current
          ? {
              ...current,
              coverImageUrl: selectedAsset.uri ?? current.coverImageUrl,
            }
          : current,
      );

      const uploaded = await uploadOrganizerEventHeaderMedia(
        selectedSummary.id,
        {
          fileName: selectedAsset.fileName,
          mimeType: selectedAsset.mimeType,
          uri: selectedAsset.uri,
        },
        session.accessToken,
      );

      setEventForm((current) =>
        current
          ? {
              ...current,
              coverImageUrl: uploaded.coverImageUrl ?? "",
            }
          : current,
      );
      await refreshOrganizerQueries();
      setNotice("Header image uploaded.");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Header image couldn't be uploaded right now."),
      );
    } finally {
      setIsSavingMedia(false);
    }
  }

  async function handleRemoveHeaderMedia() {
    if (!session?.accessToken || !selectedSummary || !eventForm?.coverImageUrl) {
      return;
    }

    setIsSavingMedia(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await removeOrganizerEventHeaderMedia(selectedSummary.id, session.accessToken);
      setEventForm((current) =>
        current
          ? {
              ...current,
              coverImageUrl: "",
            }
          : current,
      );
      await refreshOrganizerQueries();
      setNotice("Header image removed.");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Header image couldn't be removed right now."),
      );
    } finally {
      setIsSavingMedia(false);
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
          {
            ...buildTicketTypePayload(ticketTypeForm),
            currency: eventDetailQuery.data?.currency,
          },
          session.accessToken,
        );
        setNotice("Ticket type updated.");
      } else {
        const created = await createOrganizerTicketType(
          selectedSummary.id,
          {
            ...buildTicketTypePayload(ticketTypeForm),
            currency: eventDetailQuery.data?.currency,
          },
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

  async function handleOfferDecision(offerId: string, decision: "ACCEPT" | "REJECT") {
    if (!session) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);
    setIsSavingOffers(true);

    try {
      if (decision === "ACCEPT") {
        await acceptOrganizerOffer(
          offerId,
          session.accessToken,
          offerNoteDrafts[offerId]?.trim() || undefined,
        );
        setNotice("Offer request accepted.");
      } else {
        await rejectOrganizerOffer(
          offerId,
          session.accessToken,
          offerNoteDrafts[offerId]?.trim() || undefined,
        );
        setNotice("Offer request rejected.");
      }

      setOfferNoteDrafts((current) => ({ ...current, [offerId]: "" }));
      await offersQuery.refetch();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Offer decision couldn't be saved right now."));
    } finally {
      setIsSavingOffers(false);
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

  function toggleSection(section: "event" | "offers" | "staff" | "ticketTypes") {
    animateLayout();
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <Screen
      title="Event"
      subtitle="Edit event setup."
      compactHeader
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
              <Text style={styles.copy}>This account does not have organizer access.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && eventsQuery.isLoading ? (
          <Card padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Loading event</Text>
              <Text style={styles.copy}>Checking access.</Text>
            </View>
          </Card>
        ) : null}

        {hasSurfaceAccess && !eventsQuery.isLoading && !selectedSummary ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>This event isn't manageable here</Text>
              <Text style={styles.copy}>Not found in your owner/admin memberships.</Text>
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
              <Text style={styles.copy}>Syncing latest event data.</Text>
            </View>
          </Card>
        ) : null}

        {eventForm && eventDetailQuery.data ? (
          <>
            <CollapsibleSection
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
              subtitle="Title, media, schedule."
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
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Header image</Text>
                  {eventForm.coverImageUrl ? (
                    <Image
                      source={{ uri: eventForm.coverImageUrl }}
                      style={styles.headerPreviewImage}
                    />
                  ) : (
                    <View style={styles.headerPreviewPlaceholder}>
                      <Text style={styles.hintText}>
                        Add a header image to improve event sharing previews.
                      </Text>
                    </View>
                  )}
                  <View style={styles.mediaActionRow}>
                    <ActionButton
                      loading={isSavingMedia}
                      onPress={() => void handleUploadHeaderMedia()}
                      title={eventForm.coverImageUrl ? "Replace image" : "Upload image"}
                    />
                    {eventForm.coverImageUrl ? (
                      <ActionButton
                        loading={isSavingMedia}
                        onPress={() => void handleRemoveHeaderMedia()}
                        title="Remove image"
                        variant="secondary"
                      />
                    ) : null}
                  </View>
                </View>
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

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Currency</Text>
                  <SegmentedControl
                    onSelect={(value) =>
                      setEventForm((current) => (current ? { ...current, currency: value } : current))
                    }
                    options={CURRENCY_OPTIONS}
                    selected={eventForm.currency}
                  />
                  {eventDetailQuery.data.ticketTypes.length > 0 ? (
                    <Text style={styles.hintText}>
                      Currency is locked on the server after ticket types exist.
                    </Text>
                  ) : null}
                </View>

                <ActionButton
                  disabled={!eventValidation?.isValid}
                  loading={isSavingEvent}
                  onPress={() => void handleEventSave()}
                  title={eventIsDirty ? "Save details" : "Details up to date"}
                />
            </CollapsibleSection>

            <CollapsibleSection
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
              subtitle="Pricing and inventory."
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
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Pricing mode</Text>
                  <SegmentedControl
                    onSelect={(value) =>
                      setTicketTypeForm((current) => ({
                        ...current,
                        pricingMode: value as TicketTypeEditorState["pricingMode"],
                        ...((value as TicketTypeEditorState["pricingMode"]) === "FREE"
                          ? {
                              maxOfferPrice: "",
                              minOfferPrice: "",
                              offerAutoExpireMinutes: "30",
                              price: "0.00",
                            }
                          : {}),
                        ...((value as TicketTypeEditorState["pricingMode"]) === "FIXED"
                          ? {
                              maxOfferPrice: "",
                              minOfferPrice: "",
                              offerAutoExpireMinutes: "30",
                            }
                          : {}),
                      }))
                    }
                    options={TICKET_PRICING_MODE_OPTIONS}
                    selected={ticketTypeForm.pricingMode}
                  />
                </View>
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
                    {ticketTypeForm.pricingMode === "FREE" ? (
                      <Text style={styles.hintText}>Free tickets are forced to 0.00.</Text>
                    ) : null}
                    {ticketTypeForm.pricingMode === "OFFER_RANGE" ? (
                      <Text style={styles.hintText}>Base price is optional for offer-range tickets.</Text>
                    ) : null}
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
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Currency</Text>
                      <View style={[styles.input, styles.inputCompact]}>
                        <Text style={styles.readonlyValue}>
                          {eventDetailQuery.data.currency}
                        </Text>
                      </View>
                      <Text style={styles.hintText}>
                        Ticket types inherit the event currency.
                      </Text>
                    </View>
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
                {ticketTypeForm.pricingMode === "OFFER_RANGE" ? (
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Field
                        compact
                        error={ticketTypeValidation.fieldErrors.minOfferPrice}
                        label="Min offer"
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setTicketTypeForm((current) => ({ ...current, minOfferPrice: value }))
                        }
                        placeholder="5.00"
                        value={ticketTypeForm.minOfferPrice}
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Field
                        compact
                        error={ticketTypeValidation.fieldErrors.maxOfferPrice}
                        label="Max offer"
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setTicketTypeForm((current) => ({ ...current, maxOfferPrice: value }))
                        }
                        placeholder="200.00"
                        value={ticketTypeForm.maxOfferPrice}
                      />
                    </View>
                  </View>
                ) : null}
                {ticketTypeForm.pricingMode === "OFFER_RANGE" ? (
                  <Field
                    compact
                    error={ticketTypeValidation.fieldErrors.offerAutoExpireMinutes}
                    label="Offer expiry minutes"
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setTicketTypeForm((current) => ({ ...current, offerAutoExpireMinutes: value }))
                    }
                    placeholder="30"
                    value={ticketTypeForm.offerAutoExpireMinutes}
                  />
                ) : null}
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
            </CollapsibleSection>

            <CollapsibleSection
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
              subtitle="Invite and roles."
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
                        <Text style={styles.copy} numberOfLines={1}>{membership.user.email}</Text>
                      </View>
                      <View style={styles.neutralPill}>
                        <Text style={styles.neutralPillText}>
                          {getStaffStatusCopy(membership.acceptedAt)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.staffMeta}>
                      🛡 {membership.role}
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
            </CollapsibleSection>

            <CollapsibleSection
              expanded={expandedSections.offers}
              onToggle={() => toggleSection("offers")}
              status={
                isSavingOffers
                  ? "saving"
                  : notice === "Offer request accepted." || notice === "Offer request rejected."
                    ? "saved"
                    : "default"
              }
              subtitle="Attendee offers."
              title="Offer inbox"
            >
              {offersQuery.isLoading ? (
              <Text style={styles.copy}>Loading pending offers…</Text>
              ) : null}
              <View style={styles.segmentedWrap}>
                {OFFER_STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => setOfferStatusFilter(status)}
                    style={[
                      styles.segmentChip,
                      offerStatusFilter === status ? styles.segmentChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentChipText,
                        offerStatusFilter === status ? styles.segmentChipTextActive : null,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!offersQuery.isLoading && (offersQuery.data?.length ?? 0) === 0 ? (
                <View style={styles.inlineNotice}>
                  <Text style={styles.inlineNoticeTitle}>No pending offer requests right now.</Text>
                </View>
              ) : null}

              {(offersQuery.data ?? []).map((offer) => (
                <View key={offer.id} style={styles.staffCard}>
                  <Text style={styles.staffName}>
                    {offer.ticketType.name} · {offer.offeredPrice} {offer.currency}
                  </Text>
                  <Text style={styles.copy} numberOfLines={1}>
                    {offer.attendeeUser.firstName || offer.attendeeUser.lastName
                      ? `${offer.attendeeUser.firstName ?? ""} ${offer.attendeeUser.lastName ?? ""}`.trim()
                      : offer.attendeeUser.email}
                    {" · "}⏳ {formatDateTime(offer.expiresAt)}
                  </Text>
                  {offer.status === "PENDING" ? (
                    <Field
                      compact
                      hint="Optional note for attendee"
                      label="Organizer note"
                      onChangeText={(value) =>
                        setOfferNoteDrafts((current) => ({ ...current, [offer.id]: value }))
                      }
                      value={offerNoteDrafts[offer.id] ?? ""}
                    />
                  ) : null}
                  {offer.organizerNote ? (
                    <Text style={styles.copy}>Organizer note: {offer.organizerNote}</Text>
                  ) : null}
                  <View style={styles.actionRow}>
                    {offer.status === "PENDING" ? (
                      <>
                        <ActionButton
                          loading={isSavingOffers}
                          onPress={() => void handleOfferDecision(offer.id, "ACCEPT")}
                          title="Accept"
                        />
                        <ActionButton
                          loading={isSavingOffers}
                          onPress={() => void handleOfferDecision(offer.id, "REJECT")}
                          title="Reject"
                          variant="secondary"
                        />
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </CollapsibleSection>
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
  headerPreviewImage: {
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    height: 180,
    width: "100%",
  },
  headerPreviewPlaceholder: {
    alignItems: "center",
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 16,
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
  readonlyValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
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
  mediaActionRow: {
    gap: 10,
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
