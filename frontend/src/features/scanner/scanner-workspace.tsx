"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { TicketIssueVisibilityPanel } from "@/features/operations/ticket-issue-visibility-panel";
import { ScannerEventSelectorPanel } from "@/features/scanner/scanner-event-selector-panel";
import { ScannerOutcomePanel } from "@/features/scanner/scanner-outcome-panel";
import { ScannerRecentAttemptsPanel } from "@/features/scanner/scanner-recent-attempts-panel";
import { ScannerRecoveryPanel } from "@/features/scanner/scanner-recovery-panel";
import { ScannerValidationPanel } from "@/features/scanner/scanner-validation-panel";
import { ApiError } from "@/lib/api/client";
import {
  getScannerAccessibleEventIds,
  getScannerManifest,
  listScannerEvents,
  syncScannerAttempts,
  validateScannerTicket,
  type ScannerSyncAttempt,
  type ScannerSyncResponse,
} from "@/lib/scanner/scanner-client";

import type { ScannerAttemptRecord } from "./scanner-workspace.types";

type CameraBarcode = {
  rawValue?: string;
};

type CameraBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<CameraBarcode[]>;
};

type CameraBarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => CameraBarcodeDetector;

type CameraWindow = typeof globalThis & {
  BarcodeDetector?: CameraBarcodeDetectorConstructor;
};

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScannerRole(role: "OWNER" | "ADMIN" | "SCANNER") {
  switch (role) {
    case "OWNER":
      return "Owner access";
    case "ADMIN":
      return "Admin access";
    case "SCANNER":
      return "Scanner access";
  }
}

function getOutcomeTone(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return null;
  }

  if (attempt.outcome === "VALID") {
    return "success";
  }

  if (attempt.outcome === "BLOCKED") {
    return "accent";
  }

  return "danger";
}

function getOutcomeHeading(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Awaiting a validation attempt";
  }

  if (attempt.source === "DEGRADED" && attempt.outcome === "VALID") {
    return "Limited-confidence ready signal";
  }

  if (attempt.source === "DEGRADED" && attempt.outcome === "BLOCKED") {
    return "Limited-confidence blocked signal";
  }

  switch (attempt.outcome) {
    case "VALID":
      return "Entry allowed";
    case "ALREADY_USED":
      return "Ticket already used";
    case "BLOCKED":
      return "Ticket blocked for entry";
    case "INVALID":
      return "Ticket invalid";
  }
}

function getOutcomeExplanation(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Run a scan to see the live valid, used, invalid, or blocked outcome here.";
  }

  if (attempt.source === "DEGRADED") {
    switch (attempt.reasonCode) {
      case "degraded_manifest_ready":
        return "Connectivity is degraded. This ticket looks ready from the last manifest, but live truth is not currently confirmed.";
      case "degraded_manifest_used":
        return "Connectivity is degraded. The last manifest already showed this ticket as used.";
      case "degraded_manifest_blocked":
        return "Connectivity is degraded. The last manifest showed this ticket in a blocked state for entry.";
      case "degraded_manifest_stale_revision":
        return "Connectivity is degraded. The presented revision does not match the last known manifest revision.";
      default:
        return "Connectivity is degraded. This ticket could not be matched confidently from the last manifest.";
    }
  }

  switch (attempt.reasonCode) {
    case "first_entry":
      return "This ticket was valid and has now been marked as used.";
    case "already_used":
      return "This ticket has already been scanned for entry.";
    case "ticket_not_eligible":
      return "This ticket is in a state that should not be admitted right now.";
    case "stale_revision":
      return "The presented code is tied to an outdated ownership revision.";
    case "unknown_qr":
      return "The presented code does not match a known ticket for this event.";
    default:
      return "The scanner returned an outcome that should be reviewed before admitting entry.";
  }
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

function buildDegradedAttempt(
  input: string,
  revision: string,
  manifestTickets: Array<{
    ownershipRevision: number;
    qrTokenId: string;
    serialNumber: string;
    status: string;
  }>,
  scanSessionId: string | null,
): ScannerAttemptRecord {
  const trimmedInput = input.trim();
  const manifestTicket = manifestTickets.find((ticket) => ticket.qrTokenId === trimmedInput);
  const scannedAt = new Date().toISOString();

  if (!manifestTicket) {
    return {
      currentStatus: null,
      outcome: "INVALID",
      reasonCode: "degraded_manifest_unknown",
      scanSessionId,
      scannedAt,
      serialNumber: null,
      source: "DEGRADED",
      syncState: "PENDING_SYNC",
      ticketId: trimmedInput,
    };
  }

  if (revision.trim() && Number(revision) !== manifestTicket.ownershipRevision) {
    return {
      currentStatus: manifestTicket.status,
      outcome: "INVALID",
      reasonCode: "degraded_manifest_stale_revision",
      scanSessionId,
      scannedAt,
      serialNumber: manifestTicket.serialNumber,
      source: "DEGRADED",
      syncState: "PENDING_SYNC",
      ticketId: manifestTicket.qrTokenId,
    };
  }

  if (manifestTicket.status === "USED") {
    return {
      currentStatus: manifestTicket.status,
      outcome: "ALREADY_USED",
      reasonCode: "degraded_manifest_used",
      scanSessionId,
      scannedAt,
      serialNumber: manifestTicket.serialNumber,
      source: "DEGRADED",
      syncState: "PENDING_SYNC",
      ticketId: manifestTicket.qrTokenId,
    };
  }

  if (
    ["TRANSFER_PENDING", "RESALE_LISTED", "CANCELLED", "REFUNDED", "RESERVED"].includes(
      manifestTicket.status,
    )
  ) {
    return {
      currentStatus: manifestTicket.status,
      outcome: "BLOCKED",
      reasonCode: "degraded_manifest_blocked",
      scanSessionId,
      scannedAt,
      serialNumber: manifestTicket.serialNumber,
      source: "DEGRADED",
      syncState: "PENDING_SYNC",
      ticketId: manifestTicket.qrTokenId,
    };
  }

  return {
    currentStatus: manifestTicket.status,
    outcome: "VALID",
    reasonCode: "degraded_manifest_ready",
    scanSessionId,
    scannedAt,
    serialNumber: manifestTicket.serialNumber,
    source: "DEGRADED",
    syncState: "PENDING_SYNC",
    ticketId: manifestTicket.qrTokenId,
  };
}

export function ScannerWorkspace() {
  const { session } = useAuth();
  const scannerEventIds = useMemo(
    () => getScannerAccessibleEventIds(session?.user.memberships ?? []),
    [session?.user.memberships],
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scanRevision, setScanRevision] = useState("");
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [latestOutcome, setLatestOutcome] = useState<ScannerAttemptRecord | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<ScannerAttemptRecord[]>([]);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [forceDegradedMode, setForceDegradedMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraPending, startCameraTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [isSyncPending, startSyncTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const detectorRef = useRef<CameraBarcodeDetector | null>(null);
  const lastDetectedValueRef = useRef<string | null>(null);
  const lastDetectedAtRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateOnlineState = () => setIsOnline(window.navigator.onLine);

    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const eventsQuery = useQuery({
    queryFn: listScannerEvents,
    queryKey: ["scanner-events"],
  });

  const accessibleEvents = useMemo(
    () => (eventsQuery.data ?? []).filter((event) => scannerEventIds.includes(event.id)),
    [eventsQuery.data, scannerEventIds],
  );

  const selectedEvent =
    accessibleEvents.find((event) => event.id === selectedEventId) ??
    accessibleEvents[0] ??
    null;

  const selectedMembership =
    session?.user.memberships.find(
      (membership) =>
        membership.eventId === selectedEvent?.id &&
        membership.acceptedAt &&
        (membership.role === "OWNER" ||
          membership.role === "ADMIN" ||
          membership.role === "SCANNER"),
    ) ?? null;

  const manifestQuery = useQuery({
    enabled: Boolean(selectedEvent && session?.accessToken),
    queryFn: () => getScannerManifest(selectedEvent!.id, session!.accessToken),
    queryKey: ["scanner-manifest", selectedEvent?.id, session?.accessToken],
  });

  const degradedMode = forceDegradedMode || !isOnline;
  const manifestSummary = manifestQuery.data
    ? {
        blockedTickets: manifestQuery.data.tickets.filter((ticket) =>
          ["TRANSFER_PENDING", "RESALE_LISTED", "CANCELLED", "REFUNDED", "RESERVED"].includes(
            ticket.status,
          ),
        ).length,
        readyTickets: manifestQuery.data.tickets.filter(
          (ticket) => ticket.status === "ISSUED",
        ).length,
        usedTickets: manifestQuery.data.tickets.filter((ticket) => ticket.status === "USED")
          .length,
      }
    : null;

  const sampleTickets = manifestQuery.data?.tickets.slice(0, 5) ?? [];
  const pendingSyncAttempts = recentAttempts.filter(
    (attempt) => attempt.source === "DEGRADED" && attempt.syncState === "PENDING_SYNC",
  );
  const outcomeTone = getOutcomeTone(latestOutcome);
  const outcomeHeading = getOutcomeHeading(latestOutcome);
  const outcomeExplanation = getOutcomeExplanation(latestOutcome);
  const cameraSupported =
    typeof window !== "undefined" &&
    Boolean(window.navigator.mediaDevices?.getUserMedia) &&
    Boolean((window as CameraWindow).BarcodeDetector);

  function stopCamera() {
    if (scanLoopRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  function loadSampleTicket(qrTokenId: string, revision: number) {
    setScanInput(qrTokenId);
    setScanRevision(String(revision));
    setScanError(null);
  }

  function submitValidation(scannedValue?: string) {
    if (!session?.accessToken || !selectedEvent) {
      return;
    }

    const trimmedInput = (scannedValue ?? scanInput).trim();

    if (!trimmedInput) {
      setScanError("Enter a QR token id or signed QR payload before validating.");
      return;
    }

    const revision = scanRevision.trim();
    setScanError(null);
    setSyncNotice(null);

    if (degradedMode) {
      const degradedAttempt = buildDegradedAttempt(
        trimmedInput,
        revision,
        manifestQuery.data?.tickets ?? [],
        scanSessionId,
      );

      setLatestOutcome(degradedAttempt);
      setRecentAttempts((current) => [degradedAttempt, ...current].slice(0, 8));
      return;
    }

    const payload =
      trimmedInput.startsWith("eyJ")
        ? {
            deviceFingerprint: "scanner-web-console",
            deviceLabel: "Scanner Web Console",
            mode: "ONLINE" as const,
            qrPayload: trimmedInput,
            scanSessionId: scanSessionId ?? undefined,
          }
        : {
            deviceFingerprint: "scanner-web-console",
            deviceLabel: "Scanner Web Console",
            mode: "ONLINE" as const,
            qrTokenId: trimmedInput,
            scanSessionId: scanSessionId ?? undefined,
            scannedRevision: revision ? Number(revision) : undefined,
          };

    startTransition(async () => {
      try {
        const result = await validateScannerTicket(
          selectedEvent.id,
          payload,
          session.accessToken,
        );

        const attempt: ScannerAttemptRecord = {
          ...result,
          source: "ONLINE",
          syncState: "NONE",
        };

        setLatestOutcome(attempt);
        setScanSessionId(result.scanSessionId ?? scanSessionId);
        setRecentAttempts((current) => [attempt, ...current].slice(0, 8));
        setScanInput(trimmedInput);
      } catch (error) {
        setScanError(
          getErrorText(
            error,
            "Validation could not be completed right now. Please try again.",
          ),
        );
      }
    });
  }

  function handleDetectedQrValue(rawValue: string) {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      return;
    }

    const now = Date.now();
    if (
      lastDetectedValueRef.current === trimmedValue &&
      now - lastDetectedAtRef.current < 2000
    ) {
      return;
    }

    lastDetectedValueRef.current = trimmedValue;
    lastDetectedAtRef.current = now;
    setScanInput(trimmedValue);
    setScanError(null);
    submitValidation(trimmedValue);
  }

  function scheduleCameraScan() {
    if (
      typeof window === "undefined" ||
      !cameraActive ||
      !videoRef.current ||
      !detectorRef.current
    ) {
      return;
    }

    scanLoopRef.current = window.requestAnimationFrame(async () => {
      try {
        const video = videoRef.current;

        if (
          video &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          detectorRef.current
        ) {
          const detections = await detectorRef.current.detect(video);
          const rawValue = detections.find((detection) => detection.rawValue)?.rawValue;

          if (rawValue) {
            handleDetectedQrValue(rawValue);
          }
        }
      } catch {
        // Ignore transient frame-detection errors and continue polling.
      } finally {
        if (cameraActive) {
          scheduleCameraScan();
        }
      }
    });
  }

  function startCamera() {
    if (!selectedEvent) {
      setCameraError("Choose an event before starting the camera scanner.");
      return;
    }

    if (!cameraSupported) {
      setCameraError(
        "This browser does not support in-browser QR scanning. Use manual token input instead.",
      );
      return;
    }

    setCameraError(null);

    startCameraTransition(async () => {
      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
        });

        const BarcodeDetectorClass = (window as CameraWindow).BarcodeDetector;

        if (!BarcodeDetectorClass) {
          throw new Error("BarcodeDetector unavailable");
        }

        detectorRef.current = new BarcodeDetectorClass({
          formats: ["qr_code"],
        });
        streamRef.current = stream;
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        scheduleCameraScan();
      } catch {
        stopCamera();
        setCameraError(
          "Camera access could not be started. Check browser permission and use manual input if needed.",
        );
      }
    });
  }

  function syncDegradedAttempts() {
    if (
      !session?.accessToken ||
      !selectedEvent ||
      pendingSyncAttempts.length === 0 ||
      degradedMode
    ) {
      return;
    }

    setScanError(null);
    setSyncNotice(null);

    const attempts = pendingSyncAttempts.map(toSyncAttempt);

    startSyncTransition(async () => {
      try {
        const result: ScannerSyncResponse = await syncScannerAttempts(
          selectedEvent.id,
          {
            attempts,
            deviceFingerprint: "scanner-web-console",
            deviceLabel: "Scanner Web Console",
            mode: "OFFLINE_SYNC",
            scanSessionId: scanSessionId ?? undefined,
          },
          session.accessToken,
        );

        setScanSessionId(result.scanSessionId);
        setRecentAttempts((current) =>
          current.map((attempt) =>
            attempt.source === "DEGRADED" && attempt.syncState === "PENDING_SYNC"
              ? {
                  ...attempt,
                  scanSessionId: result.scanSessionId,
                  syncState: "SYNCED",
                }
              : attempt,
          ),
        );
        setSyncNotice(
          `${result.acceptedCount} degraded attempt${result.acceptedCount === 1 ? "" : "s"} synced back to the event session.`,
        );
        void manifestQuery.refetch();
      } catch (error) {
        setScanError(
          getErrorText(
            error,
            "Queued attempts could not be synchronized right now. Please retry when connectivity is restored.",
          ),
        );
      }
    });
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    stopCamera();
    setCameraError(null);
    lastDetectedValueRef.current = null;
    lastDetectedAtRef.current = 0;
  }, [selectedEventId]);

  if (eventsQuery.isLoading) {
    return (
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-success">
            Scanner setup
          </p>
          <h1 className="font-display text-3xl">Loading assigned event access</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            We are collecting the event contexts your scanner account can operate.
          </p>
        </div>
      </Panel>
    );
  }

  if (eventsQuery.isError) {
    return (
      <Panel className="border-danger/30 bg-danger/10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-danger">
            Scanner setup unavailable
          </p>
          <h1 className="font-display text-3xl">Scanner access could not be loaded</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {getErrorText(
              eventsQuery.error,
              "The scanner event list could not be loaded right now. Please try again.",
            )}
          </p>
        </div>
      </Panel>
    );
  }

  if (accessibleEvents.length === 0) {
    return (
      <Panel className="border-border/70">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-success">
            Scanner setup
          </p>
          <h1 className="font-display text-3xl">No assigned events yet</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            This account can sign into the scanner surface, but it does not currently have
            accepted scanner access for an event. Ask an organizer to invite or accept
            scanner access before doors open.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel className={degradedMode ? "border-accent-warm/30 bg-accent-warm/10" : "border-success/30 bg-success/8"}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p
              className={`text-sm font-medium uppercase tracking-[0.28em] ${
                degradedMode ? "text-accent-warm" : "text-success"
              }`}
            >
              {degradedMode ? "Degraded scanner mode" : "Scanner setup"}
            </p>
            <h1 className="font-display text-3xl">
              {degradedMode
                ? "Operate with limited confidence until connectivity returns"
                : "Choose the event entry context"}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
              {degradedMode
                ? "The scanner is using the last prepared manifest and queued attempts locally. Results are informative, but they are not full live confirmation until recovery and sync complete."
                : "Select the assigned event you are working, confirm the manifest is ready, and move into live validation once the door team is set."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground/90">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">
                Signed in as
              </p>
              <p className="mt-2 font-semibold">{session?.user.email}</p>
              <p className="text-muted">
                {selectedMembership ? formatScannerRole(selectedMembership.role) : "Scanner staff"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForceDegradedMode((current) => !current)}
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent-warm/40 hover:bg-black/10"
            >
              {forceDegradedMode ? "Return to live mode" : "Simulate degraded mode"}
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <Panel>
          <ScannerEventSelectorPanel
            accessibleEvents={accessibleEvents}
            formatDateTime={formatDateTime}
            formatScannerRole={formatScannerRole}
            selectedEventId={selectedEvent?.id ?? null}
            selectedMemberships={session?.user.memberships ?? []}
            onSelectEvent={setSelectedEventId}
          />
        </Panel>

        <Panel>
          {selectedEvent ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
                  Selected event
                </p>
                <h2 className="font-display text-3xl">{selectedEvent.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted">
                  {selectedEvent.description ??
                    "Scanner staff are scoped to the correct event, with live validation and degraded-mode recovery anchored to the same entry context."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Doors
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {formatDateTime(selectedEvent.startsAt)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Venue
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedEvent.venueName ?? "Venue pending"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Ticket types
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedEvent.ticketTypes.length} configured
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Scanner role
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedMembership ? formatScannerRole(selectedMembership.role) : "Assigned"}
                  </p>
                </div>
              </div>

              {manifestQuery.isLoading ? (
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
                  Loading scanner manifest and event validation context...
                </div>
              ) : null}

              {manifestQuery.isError ? (
                <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                  {getErrorText(
                    manifestQuery.error,
                    "Scanner manifest could not be loaded right now. Retry before scanning starts.",
                  )}
                </div>
              ) : null}

              {manifestQuery.data && manifestSummary ? (
                <div className="space-y-4">
                  <div className={`rounded-[1.35rem] border px-5 py-5 ${degradedMode ? "border-accent-warm/30 bg-accent-warm/10" : "border-success/30 bg-success/8"}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="space-y-2">
                        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${degradedMode ? "text-accent-warm" : "text-success"}`}>
                          {degradedMode ? "Degraded mode ready" : "Validation context ready"}
                        </p>
                        <h3 className="font-display text-2xl">
                          Manifest v{manifestQuery.data.manifestVersion} is loaded
                        </h3>
                        <p className="text-sm leading-6 text-foreground/90">
                          Generated {formatDateTime(manifestQuery.data.generatedAt)} for{" "}
                          {manifestQuery.data.eventTitle}. {degradedMode
                            ? "Live truth is temporarily unavailable, so the scanner is relying on this manifest until recovery and sync complete."
                            : "The scanner can validate tickets live and fall back safely if connectivity degrades."}
                        </p>
                      </div>
                      <div className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/85">
                        {degradedMode ? "Limited-confidence mode" : "Live validation ready"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        Ready tickets
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">
                        {manifestSummary.readyTickets}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        Used tickets
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">
                        {manifestSummary.usedTickets}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                        Limited states
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">
                        {manifestSummary.blockedTickets}
                      </p>
                    </div>
                  </div>

                  <ScannerValidationPanel
                    cameraActive={cameraActive}
                    cameraError={cameraError}
                    cameraSupported={cameraSupported}
                    degradedMode={degradedMode}
                    isCameraPending={isCameraPending}
                    isPending={isPending}
                    scanError={scanError}
                    scanInput={scanInput}
                    scanRevision={scanRevision}
                    scanSessionId={scanSessionId}
                    selectedEvent={selectedEvent}
                    syncNotice={syncNotice}
                    sampleTickets={sampleTickets}
                    videoRef={videoRef}
                    onStartCamera={startCamera}
                    onStopCamera={stopCamera}
                    onSubmitValidation={() => submitValidation()}
                    onClearInput={() => {
                      setScanInput("");
                      setScanRevision("");
                      setScanError(null);
                    }}
                    onLoadSampleTicket={loadSampleTicket}
                    onScanInputChange={setScanInput}
                    onScanRevisionChange={setScanRevision}
                  />

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <ScannerOutcomePanel
                      degradedMode={degradedMode}
                      formatDateTime={formatDateTime}
                      latestOutcome={latestOutcome}
                      outcomeExplanation={outcomeExplanation}
                      outcomeHeading={outcomeHeading}
                      outcomeTone={outcomeTone}
                    />

                    <ScannerRecoveryPanel
                      degradedMode={degradedMode}
                      isOnline={isOnline}
                      isSyncPending={isSyncPending}
                      pendingSyncAttempts={pendingSyncAttempts}
                      onSync={syncDegradedAttempts}
                    />
                  </div>

                  <ScannerRecentAttemptsPanel
                    formatDateTime={formatDateTime}
                    recentAttempts={recentAttempts}
                  />

                  <TicketIssueVisibilityPanel
                    accessToken={session!.accessToken}
                    eventId={selectedEvent.id}
                    mode="scanner"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
