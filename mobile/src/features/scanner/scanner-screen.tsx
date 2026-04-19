import { useQuery } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Device from "expo-device";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { SupportCard } from "@/components/support/support-card";
import { ActionButton, Card, Screen } from "@/components/ui";
import { canAccessScannerEvents, hasScannerSurfaceAccess } from "@/features/auth/scanner-access";
import {
  buildDegradedAttempt,
  getOutcomeDecisionLabel,
  getOutcomeExplanation,
  getOutcomeHeading,
  getOutcomeOperatorInstruction,
  getOutcomeTone,
  toScannerAttemptRecord,
  type ScannerAttemptRecord,
} from "@/features/scanner/scanner-model";
import {
  loadPersistedScannerState,
  persistScannerState,
  type PersistedScannerEventState,
} from "@/features/scanner/scanner-storage";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/formatters";
import {
  getScannerAccessibleEventIds,
  getScannerManifest,
  listScannerEvents,
  syncScannerAttempts,
  validateScannerTicket,
  type ScannerSyncAttempt,
} from "@/lib/scanner/scanner-client";
import { palette } from "@/styles/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CAMERA_SCAN_COOLDOWN_MS = 2500;
const MANIFEST_STALE_MINUTES = 15;
const MAX_RECENT_ATTEMPTS = 8;

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function getManifestAgeMinutes(generatedAt: string | null | undefined) {
  if (!generatedAt) {
    return null;
  }

  const generatedTime = new Date(generatedAt).getTime();

  if (Number.isNaN(generatedTime)) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - generatedTime) / 60000));
}

function SectionCard({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
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
          <Text style={styles.sectionChevron}>{expanded ? "Hide" : "Open"}</Text>
        </Pressable>
        {expanded ? children : null}
      </View>
    </Card>
  );
}

function toSyncAttempt(attempt: ScannerAttemptRecord): ScannerSyncAttempt {
  return {
    deviceRecordedAt: attempt.scannedAt,
    outcome: attempt.outcome,
    qrTokenId: attempt.ticketId ?? attempt.serialNumber ?? "unknown_qr",
    reasonCode: attempt.reasonCode,
    scannedAt: attempt.scannedAt,
    scannedRevision: undefined,
  };
}

export function ScannerScreen() {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scanRevision, setScanRevision] = useState("");
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [laneLabel, setLaneLabel] = useState("Front Gate");
  const [scanError, setScanError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [forceDegradedMode, setForceDegradedMode] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncPending, setIsSyncPending] = useState(false);
  const [latestOutcome, setLatestOutcome] = useState<ScannerAttemptRecord | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<ScannerAttemptRecord[]>([]);
  const [eventStates, setEventStates] = useState<Record<string, PersistedScannerEventState>>({});
  const [didHydrateScannerState, setDidHydrateScannerState] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    camera: true,
    event: true,
    readiness: true,
    recent: true,
  });
  const lastCameraScanRef = useRef<{
    scannedAt: number;
    value: string;
  } | null>(null);
  const activeCameraSubmissionRef = useRef(false);
  const syncNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredEventIdsRef = useRef<Set<string>>(new Set());

  const hasSurfaceAccess = hasScannerSurfaceAccess(session?.user);
  const scannerEventIds = getScannerAccessibleEventIds(session?.user.memberships ?? []);
  const eventsQuery = useQuery({
    enabled: Boolean(session?.accessToken && hasSurfaceAccess),
    queryFn: () => listScannerEvents(session!.accessToken),
    queryKey: ["scanner-events", session?.accessToken],
  });
  const accessibleEvents = useMemo(
    () => (eventsQuery.data ?? []).filter((event) => scannerEventIds.includes(event.id)),
    [eventsQuery.data, scannerEventIds],
  );
  const selectedEvent =
    accessibleEvents.find((event) => event.id === selectedEventId) ?? accessibleEvents[0] ?? null;
  const manifestQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedEvent),
    queryFn: () => getScannerManifest(selectedEvent!.id, session!.accessToken),
    queryKey: ["scanner-manifest", selectedEvent?.id, session?.accessToken],
  });
  const degradedMode = forceDegradedMode;
  const pendingSyncAttempts = recentAttempts.filter(
    (attempt) => attempt.source === "DEGRADED" && attempt.syncState === "PENDING_SYNC",
  );
  const outcomeTone = getOutcomeTone(latestOutcome);
  const decisionLabel = getOutcomeDecisionLabel(latestOutcome);
  const operatorInstruction = getOutcomeOperatorInstruction(latestOutcome);
  const isPhysicalDevice = Device.isDevice;
  const hasPreparedManifest = Boolean(manifestQuery.data);
  const manifestIsRefreshing = manifestQuery.isFetching && !manifestQuery.isLoading;
  const scannerReady = Boolean(selectedEvent && session?.accessToken);
  const canQueueDegradedAttempt = !degradedMode || hasPreparedManifest;
  const canSubmitValidation = scannerReady && canQueueDegradedAttempt && !isSaving;
  const cameraSetupReady =
    Boolean(permission?.granted) &&
    isPhysicalDevice &&
    scannerReady &&
    canQueueDegradedAttempt &&
    !isSyncPending;
  const cameraCanScan =
    cameraSetupReady && cameraEnabled && !isSaving;
  const resolvedDeviceLabel = laneLabel.trim() || "Scanner Mobile";
  const manifestAgeMinutes = getManifestAgeMinutes(manifestQuery.data?.generatedAt);
  const manifestSeemsStale =
    manifestAgeMinutes !== null && manifestAgeMinutes > MANIFEST_STALE_MINUTES;
  const readinessItems = [
    {
      detail: selectedEvent
        ? `${selectedEvent.title}${selectedEvent.venueName ? ` · ${selectedEvent.venueName}` : ""}`
        : "Pick an event before doors open.",
      label: "Event selected",
      tone: selectedEvent ? "ready" : "warning",
      value: selectedEvent ? "Ready" : "Needed",
    },
    {
      detail: manifestQuery.data
        ? manifestSeemsStale
          ? `Prepared ${manifestAgeMinutes} min ago. Refresh before peak entry if event setup changed.`
          : `Prepared ${manifestAgeMinutes ?? 0} min ago and ready for degraded recovery.`
        : "Load the current manifest before relying on degraded mode or manual fallback.",
      label: "Manifest",
      tone: manifestQuery.data ? (manifestSeemsStale ? "warning" : "ready") : "warning",
      value: manifestQuery.data
        ? manifestSeemsStale
          ? "Refresh soon"
          : `v${manifestQuery.data.manifestVersion}`
        : "Missing",
    },
    {
      detail: permission?.granted
        ? isPhysicalDevice
          ? "Camera access is available on this device."
          : "Simulator access is fine for UI checks, but not live scanning."
        : permission?.canAskAgain
          ? "Allow camera access now or plan to use manual entry."
          : "Camera is blocked in iOS settings. Manual entry is your fallback until it is restored.",
      label: "Camera permission",
      tone: permission?.granted && isPhysicalDevice ? "ready" : "warning",
      value: permission?.granted ? (isPhysicalDevice ? "Granted" : "Simulator only") : "Attention",
    },
    {
      detail: degradedMode
        ? pendingSyncAttempts.length > 0
          ? `${pendingSyncAttempts.length} queued attempt${pendingSyncAttempts.length === 1 ? "" : "s"} waiting for sync.`
          : "Using the prepared manifest with queued sync once service returns."
        : "Live validation is active and duplicate protection runs immediately.",
      label: "Validation mode",
      tone: degradedMode ? "warning" : "ready",
      value: degradedMode ? "Degraded" : "Live",
    },
    {
      detail: scanSessionId
        ? `Session ${scanSessionId.slice(-6)} is already active for this lane.`
        : "A scan session will start automatically with the first validation.",
      label: "Lane session",
      tone: scanSessionId ? "ready" : "default",
      value: scanSessionId ? "Active" : "Standby",
    },
  ] as const;
  const manifestSummary = manifestQuery.data
    ? `Manifest v${manifestQuery.data.manifestVersion} prepared ${formatDateTime(
        manifestQuery.data.generatedAt,
      )}.`
    : degradedMode
      ? "Load the latest manifest before using degraded mode."
      : "Live validation can start now. Refresh the manifest when the event setup changes.";

  function setTransientSyncNotice(message: string | null) {
    if (syncNoticeTimeoutRef.current) {
      clearTimeout(syncNoticeTimeoutRef.current);
      syncNoticeTimeoutRef.current = null;
    }

    setSyncNotice(message);

    if (message) {
      syncNoticeTimeoutRef.current = setTimeout(() => {
        setSyncNotice(null);
        syncNoticeTimeoutRef.current = null;
      }, 3200);
    }
  }

  useEffect(() => {
    if (!session?.user.id) {
      setEventStates({});
      setDidHydrateScannerState(false);
      restoredEventIdsRef.current = new Set();
      return;
    }

    let active = true;

    void loadPersistedScannerState(session.user.id).then((storedState) => {
      if (!active) {
        return;
      }

      setEventStates(storedState.eventStates);
      setLaneLabel(storedState.laneLabel);
      setSelectedEventId((current) => current ?? storedState.selectedEventId ?? null);
      setDidHydrateScannerState(true);
    });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    setCameraEnabled(false);
    setScanError(null);
    setScanInput("");
    setScanRevision("");
    setLatestOutcome(null);
    setTransientSyncNotice(null);
    lastCameraScanRef.current = null;
    activeCameraSubmissionRef.current = false;

    if (!selectedEvent?.id) {
      setRecentAttempts([]);
      setScanSessionId(null);
      return;
    }

    const restoredState = eventStates[selectedEvent.id];
    setRecentAttempts(restoredState?.recentAttempts ?? []);
    setScanSessionId(restoredState?.scanSessionId ?? null);

    if (
      restoredState?.recentAttempts.some((attempt) => attempt.syncState === "PENDING_SYNC") &&
      !restoredEventIdsRef.current.has(selectedEvent.id)
    ) {
      const pendingCount = restoredState.recentAttempts.filter(
        (attempt) => attempt.syncState === "PENDING_SYNC",
      ).length;
      setRecoveryNotice(
        `Recovered ${pendingCount} queued attempt${pendingCount === 1 ? "" : "s"} for this lane. Sync them before clearing the queue.`,
      );
      restoredEventIdsRef.current.add(selectedEvent.id);
    } else {
      setRecoveryNotice(null);
    }
  }, [eventStates, selectedEvent?.id]);

  useEffect(() => {
    if (!didHydrateScannerState || !selectedEvent?.id) {
      return;
    }

    setEventStates((current) => {
      const nextEntry: PersistedScannerEventState = {
        recentAttempts,
        scanSessionId,
      };
      const previousEntry = current[selectedEvent.id];

      if (
        previousEntry?.scanSessionId === nextEntry.scanSessionId &&
        JSON.stringify(previousEntry?.recentAttempts ?? []) ===
          JSON.stringify(nextEntry.recentAttempts)
      ) {
        return current;
      }

      return {
        ...current,
        [selectedEvent.id]: nextEntry,
      };
    });
  }, [didHydrateScannerState, recentAttempts, scanSessionId, selectedEvent?.id]);

  useEffect(() => {
    if (!didHydrateScannerState || !session?.user.id) {
      return;
    }

    void persistScannerState(session.user.id, {
      eventStates,
      laneLabel,
      selectedEventId: selectedEvent?.id ?? selectedEventId,
      version: 1,
    });
  }, [
    didHydrateScannerState,
    eventStates,
    laneLabel,
    selectedEvent?.id,
    selectedEventId,
    session?.user.id,
  ]);

  useEffect(() => {
    return () => {
      if (syncNoticeTimeoutRef.current) {
        clearTimeout(syncNoticeTimeoutRef.current);
      }
    };
  }, []);

  async function submitValidation(scannedValue?: string) {
    if (!session?.accessToken || !selectedEvent) {
      return;
    }

    const trimmedInput = (scannedValue ?? scanInput).trim();

    if (!trimmedInput) {
      setScanError("Scan a ticket or enter a token before validating.");
      return;
    }

    setScanError(null);
    setTransientSyncNotice(null);

    if (degradedMode) {
      if (!manifestQuery.data) {
        setScanError("Load the event manifest before queueing degraded validation attempts.");
        return;
      }

      const degradedAttempt = buildDegradedAttempt(
        trimmedInput,
        scanRevision,
        manifestQuery.data,
        scanSessionId,
      );
      setLatestOutcome(degradedAttempt);
      setRecentAttempts((current) =>
        [degradedAttempt, ...current].slice(0, MAX_RECENT_ATTEMPTS),
      );
      setScanInput(trimmedInput);
      return;
    }

    setIsSaving(true);

    try {
      const payload =
        trimmedInput.startsWith("eyJ")
          ? {
              deviceFingerprint: "scanner-mobile",
              deviceLabel: resolvedDeviceLabel,
              mode: "ONLINE" as const,
              qrPayload: trimmedInput,
              scanSessionId: scanSessionId ?? undefined,
            }
          : {
              deviceFingerprint: "scanner-mobile",
              deviceLabel: resolvedDeviceLabel,
              mode: "ONLINE" as const,
              qrTokenId: trimmedInput,
              scanSessionId: scanSessionId ?? undefined,
              scannedRevision: scanRevision.trim() ? Number(scanRevision.trim()) : undefined,
            };

      const result = await validateScannerTicket(selectedEvent.id, payload, session.accessToken);
      const attempt = toScannerAttemptRecord(result);
      setLatestOutcome(attempt);
      setScanSessionId(result.scanSessionId ?? scanSessionId);
      setRecentAttempts((current) => [attempt, ...current].slice(0, MAX_RECENT_ATTEMPTS));
      setScanInput(trimmedInput);
    } catch (error) {
      setScanError(
        getErrorText(error, "Validation could not be completed right now. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function syncQueuedAttempts() {
    if (
      !session?.accessToken ||
      !selectedEvent ||
      pendingSyncAttempts.length === 0 ||
      degradedMode
    ) {
      return;
    }

    setIsSyncPending(true);
    setScanError(null);
    setTransientSyncNotice(null);

    try {
      const result = await syncScannerAttempts(
        selectedEvent.id,
        {
          attempts: pendingSyncAttempts.map(toSyncAttempt),
          deviceFingerprint: "scanner-mobile",
          deviceLabel: resolvedDeviceLabel,
          mode: "OFFLINE_SYNC",
          scanSessionId: scanSessionId ?? undefined,
        },
        session.accessToken,
      );

      setScanSessionId(result.scanSessionId);
      setRecentAttempts((current) =>
        current.map((attempt) =>
          attempt.source === "DEGRADED" && attempt.syncState === "PENDING_SYNC"
            ? { ...attempt, scanSessionId: result.scanSessionId, syncState: "SYNCED" }
            : attempt,
        ),
      );
      setRecoveryNotice(null);
      setTransientSyncNotice(
        `${result.acceptedCount} queued attempt${result.acceptedCount === 1 ? "" : "s"} synced.`,
      );
      await manifestQuery.refetch();
    } catch (error) {
      setScanError(
        getErrorText(
          error,
          "Queued attempts could not be synchronized right now. Please try again.",
        ),
      );
    } finally {
      setIsSyncPending(false);
    }
  }

  async function clearQueuedAttempts() {
    const nextAttempts = recentAttempts.filter(
      (attempt) => !(attempt.source === "DEGRADED" && attempt.syncState === "PENDING_SYNC"),
    );

    setRecentAttempts(nextAttempts);
    setRecoveryNotice(null);

    if (!session?.user.id) {
      return;
    }

    const nextEventStates = {
      ...eventStates,
      ...(selectedEvent?.id
        ? {
            [selectedEvent.id]: {
              recentAttempts: nextAttempts,
              scanSessionId,
            },
          }
        : {}),
    };

    setEventStates(nextEventStates);

    await persistScannerState(session.user.id, {
      eventStates: nextEventStates,
      laneLabel,
      selectedEventId: selectedEvent?.id ?? selectedEventId,
      version: 1,
    });
  }

  function handleCameraBarcode(scannedData: string) {
    const trimmedValue = scannedData.trim();

    if (!trimmedValue || activeCameraSubmissionRef.current || !cameraCanScan) {
      return;
    }

    const now = Date.now();
    const previousScan = lastCameraScanRef.current;

    if (
      previousScan &&
      previousScan.value === trimmedValue &&
      now - previousScan.scannedAt < CAMERA_SCAN_COOLDOWN_MS
    ) {
      return;
    }

    lastCameraScanRef.current = {
      scannedAt: now,
      value: trimmedValue,
    };
    activeCameraSubmissionRef.current = true;
    setScanInput(trimmedValue);

    void submitValidation(trimmedValue).finally(() => {
      activeCameraSubmissionRef.current = false;
    });
  }

  function toggleSection(section: "camera" | "event" | "readiness" | "recent") {
    animateLayout();
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  if (eventsQuery.isLoading) {
    return (
      <Screen title="Scanner" subtitle="Preparing your assigned event access.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Loading scanner access</Text>
            <Text style={styles.copy}>We are collecting the events this account can scan.</Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (!hasSurfaceAccess || !canAccessScannerEvents(session?.user)) {
    return (
      <Screen title="Scanner" subtitle="Camera-first validation for doors and check-in.">
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>No scanner access yet</Text>
            <Text style={styles.copy}>
              This account can sign in, but it does not currently have accepted scanner access for an
              event.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen title="Scanner" subtitle="Validate entry quickly, recover safely, and keep doors moving.">
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone={degradedMode ? "warning" : "accent"} padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>{degradedMode ? "Degraded mode" : "Scanner setup"}</Text>
            <Text style={styles.heroTitle}>
              {degradedMode ? "Operate with limited confidence" : "Ready the door team"}
            </Text>
            <Text style={styles.heroCopy}>
              {degradedMode
                ? "The scanner is using the last prepared manifest and will queue attempts until sync is available."
                : "Pick your event, confirm the manifest is ready, and start scanning."}
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Events</Text>
                <Text style={styles.metricValue}>{accessibleEvents.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Queued sync</Text>
                <Text style={styles.metricValue}>{pendingSyncAttempts.length}</Text>
              </View>
            </View>
          </View>
        </Card>

        <SectionCard
          expanded={expandedSections.readiness}
          onToggle={() => toggleSection("readiness")}
          subtitle="Confirm the lane, device, manifest, and scan mode before doors open."
          title="Door readiness"
        >
          <View style={styles.readinessGrid}>
            {readinessItems.map((item) => (
              <View key={item.label} style={styles.readinessCard}>
                <View style={styles.readinessHeader}>
                  <Text style={styles.readinessLabel}>{item.label}</Text>
                  <View
                    style={[
                      styles.readinessPill,
                      item.tone === "ready"
                        ? styles.readinessPillReady
                        : item.tone === "warning"
                          ? styles.readinessPillWarning
                          : styles.readinessPillDefault,
                    ]}
                  >
                    <Text style={styles.readinessPillText}>{item.value}</Text>
                  </View>
                </View>
                <Text style={styles.copy}>{item.detail}</Text>
              </View>
            ))}
          </View>

          <TextInput
            autoCapitalize="words"
            onChangeText={setLaneLabel}
            placeholder="Lane label, for example Front Gate"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={laneLabel}
          />

          <Card tone="accent">
            <Text style={styles.sectionTitle}>Before doors open</Text>
            <Text style={styles.copy}>
              Pick the event, refresh the manifest, confirm camera permission, and label the lane on
              this device so every scan session can be traced clearly later.
            </Text>
          </Card>

          {recoveryNotice ? (
            <Card tone="warning">
              <Text style={styles.sectionTitle}>Recovered local queue</Text>
              <Text style={styles.copy}>{recoveryNotice}</Text>
            </Card>
          ) : null}
        </SectionCard>

        <SectionCard
          expanded={expandedSections.event}
          onToggle={() => toggleSection("event")}
          subtitle="Choose the event and prepare its validation manifest."
          title="Event setup"
        >
          <View style={styles.segmentedWrap}>
            {accessibleEvents.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => setSelectedEventId(event.id)}
                style={[
                  styles.segmentChip,
                  selectedEvent?.id === event.id ? styles.segmentChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentChipText,
                    selectedEvent?.id === event.id ? styles.segmentChipTextActive : null,
                  ]}
                >
                  {event.title}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedEvent ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{selectedEvent.title}</Text>
              <Text style={styles.copy}>
                {selectedEvent.description ?? "Scanner staff are scoped to this event for validation."}
              </Text>
              <Text style={styles.infoMeta}>
                {formatDateTime(selectedEvent.startsAt)}
                {selectedEvent.venueName ? ` · ${selectedEvent.venueName}` : ""}
              </Text>
            </View>
          ) : null}

          {manifestQuery.isLoading ? (
            <Text style={styles.copy}>Loading validation manifest...</Text>
          ) : null}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {manifestQuery.data ? `Manifest v${manifestQuery.data.manifestVersion} is loaded` : "Manifest status"}
            </Text>
            <Text style={styles.copy}>{manifestSummary}</Text>
            {manifestQuery.data ? (
              <Text style={styles.infoMeta}>
                {manifestQuery.data.tickets.length} prepared ticket
                {manifestQuery.data.tickets.length === 1 ? "" : "s"}
              </Text>
            ) : null}
            {manifestQuery.error ? (
              <Text style={styles.warningText}>
                {getErrorText(
                  manifestQuery.error,
                  "The latest validation manifest could not be loaded.",
                )}
              </Text>
            ) : null}
            <ActionButton
              disabled={!selectedEvent}
              loading={manifestIsRefreshing}
              onPress={() => void manifestQuery.refetch()}
              title={manifestQuery.data ? "Refresh manifest" : "Load manifest"}
              variant="secondary"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.fieldLabel}>Use degraded mode</Text>
              <Text style={styles.copy}>
                Queue attempts locally and sync them when you return live.
              </Text>
            </View>
            <Switch
              onValueChange={setForceDegradedMode}
              trackColor={{ false: "#d9c7b4", true: "#d0b08f" }}
              thumbColor={forceDegradedMode ? palette.accentDeep : "#ffffff"}
              value={forceDegradedMode}
            />
          </View>

          {degradedMode && !hasPreparedManifest ? (
            <Card tone="warning">
              <Text style={styles.copy}>
                Degraded mode needs a prepared manifest for this event before any queued result can be
                trusted.
              </Text>
            </Card>
          ) : null}

          {!hasPreparedManifest && pendingSyncAttempts.length > 0 ? (
            <Card tone="warning">
              <Text style={styles.sectionTitle}>Queue needs recovery</Text>
              <Text style={styles.copy}>
                This lane still has queued attempts, but the manifest is not loaded yet. Refresh the
                manifest before trusting degraded results or syncing any recovered queue.
              </Text>
            </Card>
          ) : null}

          {pendingSyncAttempts.length > 0 && !degradedMode ? (
            <View style={styles.buttonRow}>
              <View style={styles.buttonFill}>
                <ActionButton
                  loading={isSyncPending}
                  onPress={() => void syncQueuedAttempts()}
                  title="Sync queued attempts"
                />
              </View>
              <View style={styles.buttonFill}>
                <ActionButton
                  onPress={() => void clearQueuedAttempts()}
                  title="Clear local queue"
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}

          {syncNotice ? (
            <Card tone="success">
              <Text style={styles.copy}>{syncNotice}</Text>
            </Card>
          ) : null}
        </SectionCard>

        <SectionCard
          expanded={expandedSections.camera}
          onToggle={() => toggleSection("camera")}
          subtitle="Camera-first scanning with manual fallback."
          title="Validation"
        >
          {!isPhysicalDevice ? (
            <Card tone="accent">
              <Text style={styles.sectionTitle}>Camera scanning needs a real device</Text>
              <Text style={styles.copy}>
                The iOS Simulator can ask for camera permission, but it does not provide a reliable
                live camera feed for ticket scanning. Use manual token entry here, or open the app on
                an iPhone to test door scanning.
              </Text>
            </Card>
          ) : null}

          {permission?.granted === false ? (
            <Card>
              <Text style={styles.sectionTitle}>Camera permission required</Text>
              <Text style={styles.copy}>
                {permission.canAskAgain
                  ? "Allow camera access to scan tickets directly from this device."
                  : "Camera access is currently blocked for this app. You can keep working with manual entry, or reopen camera access from iOS Settings."}
              </Text>
              {permission.canAskAgain ? (
                <ActionButton onPress={() => void requestPermission()} title="Enable camera" />
              ) : null}
            </Card>
          ) : null}

          {permission?.granted ? (
            <>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.fieldLabel}>Camera scanning</Text>
                  <Text style={styles.copy}>
                    {cameraCanScan
                      ? "Use the back camera to scan QR codes at the door."
                      : !isPhysicalDevice
                        ? "Manual entry stays available in the simulator. Use a physical device for live scanning."
                      : !scannerReady
                        ? "Choose an event before opening the camera."
                      : degradedMode && !hasPreparedManifest
                        ? "Camera scanning will resume once the event manifest has been prepared."
                        : isSyncPending
                          ? "Queued attempts are syncing now. Camera scanning will resume in a moment."
                        : isSaving
                          ? "The scanner is processing the latest result."
                          : "The scanner is ready. Turn on the camera when your lane is set."}
                  </Text>
                </View>
                <Switch
                  onValueChange={setCameraEnabled}
                  disabled={!permission?.granted || !isPhysicalDevice || !cameraSetupReady}
                  trackColor={{ false: "#d9c7b4", true: "#d0b08f" }}
                  thumbColor={cameraEnabled ? palette.accentDeep : "#ffffff"}
                  value={cameraEnabled}
                />
              </View>

              {cameraEnabled ? (
                <View style={styles.cameraShell}>
                  <CameraView
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={cameraCanScan ? (event) => handleCameraBarcode(event.data) : undefined}
                    style={styles.camera}
                  />
                  {!cameraCanScan ? (
                    <View style={styles.cameraOverlay}>
                      <Text style={styles.cameraOverlayTitle}>Scanner paused</Text>
                      <Text style={styles.cameraOverlayCopy}>
                        {degradedMode && !hasPreparedManifest
                          ? "Load the current manifest before scanning in degraded mode."
                          : !isPhysicalDevice
                            ? "Run this screen on a physical device to scan live QR codes."
                          : isSaving
                            ? "Finishing the previous validation now."
                            : "Complete setup to resume camera scanning."}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}

          <TextInput
            autoCapitalize="none"
            onChangeText={setScanInput}
            placeholder="Paste QR token or signed payload"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={scanInput}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={setScanRevision}
            placeholder="Ownership revision, if the guest has it"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={scanRevision}
          />

          <Card tone="accent">
            <Text style={styles.sectionTitle}>Manual fallback</Text>
            <Text style={styles.copy}>
              Use manual entry when the camera cannot focus, when a guest presents a copied token, or
              when the lane needs a second attempt without reopening the camera.
            </Text>
            <Text style={styles.infoMeta}>
              Paste the QR token or signed payload first. Add the ownership revision only when it is
              available from the guest or another trusted staff device.
            </Text>
          </Card>

          {degradedMode && !hasPreparedManifest ? (
            <Card tone="warning">
              <Text style={styles.sectionTitle}>No manifest, no safe degraded validation</Text>
              <Text style={styles.copy}>
                Manual entry is still visible for investigation, but do not treat any degraded result
                as trustworthy until the manifest is loaded for this event.
              </Text>
            </Card>
          ) : null}

          <ActionButton
            disabled={!canSubmitValidation}
            loading={isSaving}
            onPress={() => void submitValidation()}
            title={degradedMode ? "Queue validation attempt" : "Validate ticket"}
          />

          {scanError ? (
            <Card tone="warning">
              <Text style={styles.copy}>{scanError}</Text>
            </Card>
          ) : null}

          <Card tone={outcomeTone} padded={false}>
            <View style={styles.outcomeShell}>
              <View style={styles.outcomeHeader}>
                <Text style={styles.outcomeEyebrow}>
                  {latestOutcome?.source === "DEGRADED" ? "Degraded result" : "Latest result"}
                </Text>
                <View style={styles.outcomeDecisionPill}>
                  <Text style={styles.outcomeDecisionPillText}>{decisionLabel}</Text>
                </View>
              </View>
              <Text style={styles.outcomeTitle}>{getOutcomeHeading(latestOutcome)}</Text>
              <Text style={styles.outcomeLead}>{operatorInstruction}</Text>
              <Text style={styles.copy}>{getOutcomeExplanation(latestOutcome)}</Text>
              {latestOutcome ? (
                <View style={styles.outcomeMetaGrid}>
                  <View style={styles.outcomeMetaCard}>
                    <Text style={styles.outcomeMetaLabel}>Serial</Text>
                    <Text style={styles.outcomeMetaValue}>
                      {latestOutcome.serialNumber ?? "Unavailable"}
                    </Text>
                  </View>
                  <View style={styles.outcomeMetaCard}>
                    <Text style={styles.outcomeMetaLabel}>Scanned</Text>
                    <Text style={styles.outcomeMetaValue}>
                      {formatDateTime(latestOutcome.scannedAt)}
                    </Text>
                  </View>
                  <View style={styles.outcomeMetaCard}>
                    <Text style={styles.outcomeMetaLabel}>Source</Text>
                    <Text style={styles.outcomeMetaValue}>
                      {latestOutcome.source === "DEGRADED" ? "Prepared manifest" : "Live validation"}
                    </Text>
                  </View>
                  <View style={styles.outcomeMetaCard}>
                    <Text style={styles.outcomeMetaLabel}>Ticket state</Text>
                    <Text style={styles.outcomeMetaValue}>
                      {latestOutcome.currentStatus ?? "Unknown"}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Card>

          <Card tone={latestOutcome?.outcome === "BLOCKED" || latestOutcome?.outcome === "INVALID" ? "warning" : "default"}>
            <Text style={styles.sectionTitle}>Escalation playbook</Text>
            <Text style={styles.copy}>
              {latestOutcome?.outcome === "BLOCKED"
                ? "Keep the guest aside, do not admit yet, and confirm the serial, ticket holder identity, and latest ownership state with an organizer or supervisor."
                : latestOutcome?.outcome === "ALREADY_USED"
                  ? "Treat this as a potential duplicate or prior entry. Do not rescan repeatedly. Verify the guest with a supervisor before any exception is made."
                  : latestOutcome?.outcome === "INVALID"
                    ? "Ask for the newest wallet ticket or purchase confirmation, then retry carefully. If the code still fails, route the guest to support instead of holding the lane."
                    : degradedMode
                      ? "If service is weak, keep the lane moving with caution, queue the attempt, and sync as soon as connectivity returns."
                      : "If a lane stalls, switch to manual entry, keep the next guests moving, and escalate only the disputed case rather than stopping the whole line."}
            </Text>
          </Card>
        </SectionCard>

        <SectionCard
          expanded={expandedSections.recent}
          onToggle={() => toggleSection("recent")}
          subtitle="Recent attempts help the door team stay confident."
          title="Recent attempts"
        >
          {recentAttempts.length ? (
            recentAttempts.map((attempt, index) => (
              <View key={`${attempt.scannedAt}-${index}`} style={styles.attemptCard}>
                <View style={styles.attemptHeader}>
                  <Text style={styles.attemptTitle}>{getOutcomeHeading(attempt)}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{attempt.outcome}</Text>
                  </View>
                </View>
                <Text style={styles.attemptLead}>{getOutcomeOperatorInstruction(attempt)}</Text>
                <Text style={styles.copy}>{getOutcomeExplanation(attempt)}</Text>
                <View style={styles.attemptMetaRow}>
                  <Text style={styles.infoMeta}>
                    {attempt.serialNumber ?? attempt.ticketId ?? "Unknown ticket"}
                  </Text>
                  <Text style={styles.infoMeta}>{formatDateTime(attempt.scannedAt)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No attempts yet</Text>
              <Text style={styles.copy}>Your latest scans will appear here.</Text>
            </View>
          )}
        </SectionCard>

        {scanError || (permission && !permission.granted) || latestOutcome?.outcome === "BLOCKED" ? (
          <SupportCard
            body="If camera access stays blocked, validation keeps failing, or a guest dispute needs follow-up, route the case to support with the event name and any ticket serial or token reference."
            subject={`TicketSystem scanner help${selectedEvent ? ` for ${selectedEvent.title}` : ""}`}
            title="Need help resolving a scan issue?"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  attemptCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  attemptHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  attemptLead: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  attemptMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  attemptTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(16, 13, 10, 0.74)",
    bottom: 0,
    gap: 8,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cameraOverlayCopy: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  cameraOverlayTitle: {
    color: palette.white,
    fontSize: 19,
    fontWeight: "800",
  },
  cameraShell: {
    borderRadius: 24,
    height: 320,
    overflow: "hidden",
  },
  buttonFill: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
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
  emptyCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  fieldLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
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
  infoCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  infoMeta: {
    color: palette.mutedSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 18,
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
  outcomeEyebrow: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  outcomeDecisionPill: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  outcomeDecisionPillText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  outcomeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  outcomeLead: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  outcomeMetaCard: {
    backgroundColor: "rgba(255,255,255,0.44)",
    borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "48%",
    gap: 4,
    minWidth: 140,
    padding: 12,
  },
  outcomeMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  outcomeMetaLabel: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  outcomeMetaValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  outcomeShell: {
    gap: 12,
    padding: 18,
  },
  outcomeTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  readinessCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  readinessGrid: {
    gap: 12,
  },
  readinessHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  readinessLabel: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  readinessPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readinessPillDefault: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderWidth: 1,
  },
  readinessPillReady: {
    backgroundColor: "#dff3e7",
    borderColor: "#b7dfc6",
    borderWidth: 1,
  },
  readinessPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  readinessPillWarning: {
    backgroundColor: "#f7e5d0",
    borderColor: "#e7c399",
    borderWidth: 1,
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
    paddingVertical: 10,
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
  statusPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
  warningText: {
    color: palette.accentDeep,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});
