import { useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Image,
  Platform,
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
import {
  deriveOrganizerSetupStep,
  type OrganizerSetupStep,
} from "@/features/organizer/organizer-setup-flow";
import {
  blankEventEditorState,
  buildOrganizerEventCreatePayload,
  formatLocalDateTimeInput,
  parseLocalDateTimeInput,
  type EventEditorState,
  validateEventEditorState,
} from "@/features/organizer/organizer-model";
import { ApiError } from "@/lib/api/client";
import {
  createOrganizerEvent,
  uploadOrganizerEventHeaderMedia,
} from "@/lib/organizer/events-client";
import { getOrganizerProfile } from "@/lib/organizer/organizer-profile-client";
import { getPaystackOrganizerAccountStatus } from "@/lib/payments/paystack-organizer-account-client";
import { getStripeConnectAccountStatus } from "@/lib/payments/stripe-connect-client";
import { palette } from "@/styles/theme";

const STATUS_OPTIONS: EventEditorState["status"][] = ["DRAFT", "PUBLISHED"];
const CURRENCY_OPTIONS: EventEditorState["currency"][] = ["EUR", "NGN"];
const QUICK_START_PRESETS = [
  {
    copy: "Best for paid student nights and music-led drops.",
    description: "Late-night energy, strong ticketing control, and fast on-site check-in.",
    durationHours: 5,
    id: "campus-night",
    title: "Campus night",
  },
  {
    copy: "Good for workshops, classes, and structured sessions.",
    description: "Smaller-capacity event with a clear start, end, and simple attendee flow.",
    durationHours: 3,
    id: "workshop",
    title: "Workshop",
  },
  {
    copy: "Ideal for free meetups and community gatherings.",
    description: "Friendly RSVP-style event with lighter commercial setup pressure.",
    durationHours: 2,
    id: "meetup",
    title: "Free meetup",
  },
] as const;

type QuickStartPreset = (typeof QUICK_START_PRESETS)[number];
type StagedHeaderImage = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function toPresetSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateTimeFieldValue(value: string) {
  const parsed = parseLocalDateTimeInput(value);

  if (!parsed) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getPublishIntentMessage(input: {
  provider: "STRIPE" | "PAYSTACK" | "MANUAL" | null | undefined;
  setupStep: OrganizerSetupStep;
}) {
  if (input.setupStep === "complete") {
    return "Your payout setup is ready. Free events can publish immediately, and paid ticket setup can continue cleanly once you add ticket types.";
  }

  if (input.setupStep === "identity") {
    return "You can still create this event, but add your organizer name before relying on paid publishing later.";
  }

  if (input.setupStep === "location") {
    return "You can publish the shell, but add country and payout currency before paid ticket sales can go live.";
  }

  if (input.setupStep === "provider") {
    return "You can publish the event shell now, but choose a payout provider before paid tickets can publish.";
  }

  if (input.provider === "PAYSTACK") {
    return "This event shell can publish now, but finish Paystack payout setup before paid ticket sales go live.";
  }

  if (input.setupStep === "payments") {
    return "You can publish the event shell now, but connect your payout provider before paid ticket sales can go live.";
  }

  if (input.setupStep === "verification") {
    return "You can publish the event shell now, but finish payout verification before paid ticket sales can go live.";
  }

  return "Publishing the event shell is okay, but paid sales still depend on completing organizer payout setup.";
}

function Field({
  error,
  hint,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
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
  onSelect,
  options,
  selected,
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

function EventDateTimeField({
  allowClear = false,
  error,
  hint,
  isOpen,
  label,
  onChangeText,
  onToggle,
  placeholder,
  value,
}: {
  allowClear?: boolean;
  error?: string;
  hint?: string;
  isOpen: boolean;
  label: string;
  onChangeText: (value: string) => void;
  onToggle: () => void;
  placeholder: string;
  value: string;
}) {
  const parsedValue = parseLocalDateTimeInput(value) ?? new Date();
  const displayValue = formatDateTimeFieldValue(value);

  const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    onChangeText(formatLocalDateTimeInput(selectedDate));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={onToggle}
        style={[
          styles.input,
          styles.dateInputShell,
          error ? styles.inputError : null,
        ]}
      >
        <Text style={displayValue ? styles.dateInputValue : styles.dateInputPlaceholder}>
          {displayValue ?? placeholder}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && isOpen ? (
        <View style={styles.datePickerCard}>
          <DateTimePicker
            display="spinner"
            minuteInterval={5}
            mode="datetime"
            onChange={handleIosChange}
            value={parsedValue}
          />
          <View style={styles.datePickerActions}>
            {allowClear && value ? (
              <Pressable onPress={() => onChangeText("")} style={styles.inlineAction}>
                <Text style={styles.inlineDangerText}>Clear</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onToggle} style={styles.inlineAction}>
              <Text style={styles.inlineActionText}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

export function OrganizerEventCreationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshSession, session } = useAuth();
  const [form, setForm] = useState<EventEditorState>(() => blankEventEditorState());
  const [activeDateField, setActiveDateField] = useState<
    "startsAt" | "endsAt" | "salesStartAt" | "salesEndAt" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [stagedHeaderImage, setStagedHeaderImage] = useState<StagedHeaderImage | null>(null);
  const hasOrganizerAccess = hasOrganizerSurfaceAccess(session?.user);
  const validation = useMemo(() => validateEventEditorState(form), [form]);
  const organizerProfileQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasOrganizerAccess),
    queryFn: () => getOrganizerProfile(session!.accessToken),
    queryKey: ["organizer-profile", session?.accessToken],
  });
  const stripeAccountQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasOrganizerAccess),
    queryFn: () => getStripeConnectAccountStatus(session!.accessToken),
    queryKey: ["organizer-stripe-account", session?.accessToken],
  });
  const paystackAccountQuery = useQuery({
    enabled: Boolean(
      session?.accessToken &&
        hasOrganizerAccess &&
        organizerProfileQuery.data?.selectedPaymentProvider === "PAYSTACK",
    ),
    queryFn: () => getPaystackOrganizerAccountStatus(session!.accessToken),
    queryKey: ["organizer-paystack-account", session?.accessToken],
  });
  const organizerSetupStep = deriveOrganizerSetupStep({
    paystackAccount: paystackAccountQuery.data,
    profile: organizerProfileQuery.data,
    stripeAccount: stripeAccountQuery.data,
  });
  const selectedPaymentProvider = organizerProfileQuery.data?.selectedPaymentProvider ?? null;
  const isPublishedIntent = form.status === "PUBLISHED";
  const publishIntentMessage = getPublishIntentMessage({
    provider: selectedPaymentProvider,
    setupStep: organizerSetupStep,
  });
  const selectedPreset = QUICK_START_PRESETS.find((preset) => preset.id === selectedPresetId) ?? null;

  function updateField<Key extends keyof EventEditorState>(
    key: Key,
    value: EventEditorState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openDatePicker(
    field: "startsAt" | "endsAt" | "salesStartAt" | "salesEndAt",
    value: string,
  ) {
    if (Platform.OS === "android") {
      const initialValue = parseLocalDateTimeInput(value) ?? new Date();
      DateTimePickerAndroid.open({
        is24Hour: true,
        minuteInterval: 5,
        mode: "date",
        onChange: (_dateEvent, selectedDate) => {
          if (!selectedDate) {
            return;
          }

          DateTimePickerAndroid.open({
            is24Hour: true,
            minuteInterval: 5,
            mode: "time",
            onChange: (_timeEvent, selectedTime) => {
              if (!selectedTime) {
                return;
              }

              const nextDate = new Date(selectedDate);
              nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              updateField(field, formatLocalDateTimeInput(nextDate));
            },
            value: initialValue,
          });
        },
        value: initialValue,
      });
      return;
    }

    setActiveDateField((current) => (current === field ? null : field));
  }

  function applyQuickStartPreset(preset: QuickStartPreset) {
    const currentStart = parseLocalDateTimeInput(form.startsAt) ?? new Date();
    const nextEnd = new Date(currentStart.getTime() + preset.durationHours * 60 * 60 * 1000);
    const nextTitle =
      preset.id === "campus-night"
        ? "Campus Night"
        : preset.id === "workshop"
          ? "Workshop Session"
          : "Community Meetup";

    setSelectedPresetId(preset.id);
    setForm((current) => ({
      ...current,
      description: preset.description,
      endsAt: formatLocalDateTimeInput(nextEnd),
      slug: toPresetSlug(nextTitle),
      status: preset.id === "meetup" ? "DRAFT" : current.status,
      timezone: current.timezone || "Europe/Dublin",
      title: nextTitle,
    }));
    setNotice(`${preset.title} preset applied. Core event fields have been prefilled for you.`);
  }

  async function handlePickHeaderImage() {
    setIsPickingImage(true);
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
        setErrorMessage("Unsupported image format. Please choose JPEG, PNG, or WEBP.");
        return;
      }

      if (typeof selectedAsset.fileSize === "number" && selectedAsset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage("Image must be 5MB or smaller.");
        return;
      }

      setStagedHeaderImage({
        fileName: selectedAsset.fileName,
        mimeType: selectedAsset.mimeType,
        uri: selectedAsset.uri,
      });
      setNotice("Header image added. We’ll upload it right after the event is created.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Image picker could not be opened right now."));
    } finally {
      setIsPickingImage(false);
    }
  }

  async function handleCreateEvent() {
    if (!session?.accessToken) {
      setErrorMessage("Your organizer session is unavailable. Sign in again to continue.");
      return;
    }

    if (!hasOrganizerAccess) {
      setErrorMessage("Organizer access is required before creating an event.");
      return;
    }

    if (!validation.isValid) {
      setErrorMessage("Check the highlighted event details and try again.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const created = await createOrganizerEvent(
        buildOrganizerEventCreatePayload(form),
        session.accessToken,
      );
      let mediaStatus: "failed" | "none" | "uploaded" = "none";

      if (stagedHeaderImage) {
        try {
          await uploadOrganizerEventHeaderMedia(created.id, stagedHeaderImage, session.accessToken);
          mediaStatus = "uploaded";
        } catch {
          mediaStatus = "failed";
        }
      }

      await refreshSession();
      await queryClient.invalidateQueries({ queryKey: ["organizer-events", session.accessToken] });
      setNotice("Event created. Opening the event workspace now.");
      router.replace({
        pathname: "/organizer/[slug]",
        params: {
          created: "1",
          focus: "ticket-types",
          mediaStatus,
          publishIntent: form.status,
          slug: created.slug,
        },
      } as never);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Event could not be created right now."));
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasOrganizerAccess) {
    return (
      <Screen title="Create event" subtitle="Organizer access is required.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Organizer access needed</Text>
              <Text style={styles.copy}>
                Upgrade this account to organizer access first, then return here to create an
                event from mobile.
              </Text>
              <ActionButton
                onPress={() => {
                  router.replace("/account" as never);
                }}
                title="Go to account"
              />
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen title="Create event" subtitle="Start with the event shell, then refine it.">
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Mobile organizer creation</Text>
            <Text style={styles.heroTitle}>Create the event draft first.</Text>
            <Text style={styles.heroCopy}>
              We’ll save the core event details here, then take you into the full event workspace
              for ticket types, media, staff, and publish readiness.
            </Text>
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Quick start</Text>
            <Text style={styles.copy}>
              Pick a starting shape if it helps. These presets only prefill a few details — nothing
              is locked in.
            </Text>
            <View style={styles.presetWrap}>
              {QUICK_START_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => applyQuickStartPreset(preset)}
                  style={[
                    styles.presetCard,
                    selectedPresetId === preset.id ? styles.presetCardActive : null,
                  ]}
                >
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetCopy}>{preset.copy}</Text>
                </Pressable>
              ))}
            </View>
            {selectedPreset ? (
              <Text style={styles.hintText}>
                Using {selectedPreset.title.toLowerCase()} as a starting point.
              </Text>
            ) : null}
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Event basics</Text>
            <Field
              error={validation.fieldErrors.title}
              label="Event title"
              onChangeText={(value) => updateField("title", value)}
              placeholder="Campus Neon Takeover"
              value={form.title}
            />
            <Field
              error={validation.fieldErrors.slug}
              hint="Use a short mobile-friendly slug like campus-neon-takeover."
              label="Event slug"
              onChangeText={(value) => updateField("slug", value)}
              placeholder="campus-neon-takeover"
              value={form.slug}
            />
            <Field
              label="Description"
              multiline
              onChangeText={(value) => updateField("description", value)}
              placeholder="Private student event with smart ticketing and clean check-in."
              value={form.description}
            />
            <Field
              label="Venue name"
              onChangeText={(value) => updateField("venueName", value)}
              placeholder="The Dock Warehouse"
              value={form.venueName}
            />
            <Field
              label="Venue address"
              onChangeText={(value) => updateField("venueAddress", value)}
              placeholder="12 River Lane, Dublin"
              value={form.venueAddress}
            />
            <Field
              error={validation.fieldErrors.timezone}
              hint="Keep this aligned with the event’s real operating timezone."
              label="Timezone"
              onChangeText={(value) => updateField("timezone", value)}
              placeholder="Europe/Dublin"
              value={form.timezone}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Header image</Text>
              {stagedHeaderImage ? (
                <Image source={{ uri: stagedHeaderImage.uri }} style={styles.headerPreviewImage} />
              ) : (
                <View style={styles.headerPreviewPlaceholder}>
                  <Text style={styles.hintText}>
                    Add a strong header image now and we’ll upload it as soon as the event is
                    created.
                  </Text>
                </View>
              )}
              <View style={styles.actionRow}>
                <ActionButton
                  loading={isPickingImage}
                  onPress={() => void handlePickHeaderImage()}
                  title={stagedHeaderImage ? "Replace image" : "Add header image"}
                />
                {stagedHeaderImage ? (
                  <ActionButton
                    onPress={() => {
                      setStagedHeaderImage(null);
                      setNotice("Header image removed from this draft.");
                    }}
                    title="Remove image"
                    variant="secondary"
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Commercial setup</Text>
            <Text style={styles.fieldLabel}>Currency</Text>
            <SegmentedControl
              onSelect={(value) => updateField("currency", value)}
              options={CURRENCY_OPTIONS}
              selected={form.currency}
            />

            <Text style={styles.fieldLabel}>Initial status</Text>
            <SegmentedControl
              onSelect={(value) => updateField("status", value)}
              options={STATUS_OPTIONS}
              selected={form.status}
            />
            <Text style={styles.hintText}>
              Draft is the safest start. Paid publish checks will still run later if needed.
            </Text>
          </View>
        </Card>

        {isPublishedIntent ? (
          <Card
            tone={organizerSetupStep === "complete" ? "success" : "warning"}
            padded={false}
          >
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Publishing intent</Text>
              <Text style={styles.copy}>
                You’re creating this event as <Text style={styles.emphasis}>published</Text>, so
                the event shell can go live immediately.
              </Text>
              <Text style={styles.copy}>{publishIntentMessage}</Text>
              <Text style={styles.hintText}>
                Paid publish readiness still matters when you add paid ticket types. Free events are
                the least risky way to go live quickly.
              </Text>
              {organizerSetupStep !== "complete" ? (
                <ActionButton
                  onPress={() => {
                    router.push("/organizer/setup" as never);
                  }}
                  title="Review organizer setup"
                  variant="secondary"
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <EventDateTimeField
              error={validation.fieldErrors.startsAt}
              hint="Required. This anchors public event discovery."
              isOpen={activeDateField === "startsAt"}
              label="Starts"
              onChangeText={(value) => updateField("startsAt", value)}
              onToggle={() => openDatePicker("startsAt", form.startsAt)}
              placeholder="Pick event start"
              value={form.startsAt}
            />
            <EventDateTimeField
              allowClear
              error={validation.fieldErrors.endsAt}
              hint="Optional, but recommended for attendee clarity."
              isOpen={activeDateField === "endsAt"}
              label="Ends"
              onChangeText={(value) => updateField("endsAt", value)}
              onToggle={() => openDatePicker("endsAt", form.endsAt)}
              placeholder="Pick event end"
              value={form.endsAt}
            />
            <EventDateTimeField
              allowClear
              error={validation.fieldErrors.salesStartAt}
              hint="Optional. Leave blank to let sales open immediately."
              isOpen={activeDateField === "salesStartAt"}
              label="Event sales start"
              onChangeText={(value) => updateField("salesStartAt", value)}
              onToggle={() => openDatePicker("salesStartAt", form.salesStartAt)}
              placeholder="Pick sales start"
              value={form.salesStartAt}
            />
            <EventDateTimeField
              allowClear
              error={validation.fieldErrors.salesEndAt}
              hint="Optional. Ticket-type windows still need to sit inside this range."
              isOpen={activeDateField === "salesEndAt"}
              label="Event sales end"
              onChangeText={(value) => updateField("salesEndAt", value)}
              onToggle={() => openDatePicker("salesEndAt", form.salesEndAt)}
              placeholder="Pick sales end"
              value={form.salesEndAt}
            />
          </View>
        </Card>

        {errorMessage ? (
          <Card tone="warning" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Creation needs attention</Text>
              <Text style={styles.warningText}>{errorMessage}</Text>
            </View>
          </Card>
        ) : null}

        {notice ? (
          <Card tone="success" padded={false}>
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>Almost there</Text>
              <Text style={styles.copy}>{notice}</Text>
            </View>
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>What happens next</Text>
            <Text style={styles.copy}>
              After creation, we’ll open the event workspace so you can add ticket types, upload
              media, invite staff, and publish when you’re ready.
            </Text>
            <ActionButton
              loading={isSaving}
              onPress={() => void handleCreateEvent()}
              title={form.status === "PUBLISHED" ? "Create and review publish state" : "Create draft event"}
            />
            <ActionButton
              onPress={() => {
                setSelectedPresetId(null);
                setStagedHeaderImage(null);
                setNotice("Draft form reset.");
                setErrorMessage(null);
                setForm(blankEventEditorState());
              }}
              title="Reset form"
              variant="secondary"
            />
            <ActionButton
              onPress={() => {
                router.back();
              }}
              title="Cancel"
              variant="secondary"
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
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
  dateInputPlaceholder: {
    color: palette.muted,
    fontSize: 16,
  },
  dateInputShell: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateInputValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  datePickerCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden",
    paddingBottom: 12,
  },
  emphasis: {
    color: palette.ink,
    fontWeight: "800",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 8,
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
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  fieldLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
  },
  heroEyebrow: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroShell: {
    backgroundColor: palette.accent,
    gap: 10,
    padding: 20,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  hintText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineActionText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  inlineDangerText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: "700",
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
  inputError: {
    borderColor: palette.danger,
  },
  presetCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    gap: 6,
    minHeight: 96,
    padding: 14,
  },
  presetCardActive: {
    borderColor: palette.accent,
    shadowColor: palette.accent,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  presetCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  presetTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "800",
  },
  segmentedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  segmentChip: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  segmentChipText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentChipTextActive: {
    color: palette.white,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  warningText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
