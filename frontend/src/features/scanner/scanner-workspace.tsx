"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import {
  getScannerAccessibleEventIds,
  getScannerManifest,
  listScannerEvents,
  syncScannerAttempts,
  validateScannerTicket,
  type ScannerSyncAttempt,
  type ScannerSyncResponse,
  type ScannerValidationResponse,
} from "@/lib/scanner/scanner-client";

type ScannerAttemptRecord = ScannerValidationResponse & {
  source: "DEGRADED" | "ONLINE";
  syncState: "NONE" | "PENDING_SYNC" | "SYNCED";
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
  const [isPending, startTransition] = useTransition();
  const [isSyncPending, startSyncTransition] = useTransition();

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

  function loadSampleTicket(qrTokenId: string, revision: number) {
    setScanInput(qrTokenId);
    setScanRevision(String(revision));
    setScanError(null);
  }

  function submitValidation() {
    if (!session?.accessToken || !selectedEvent) {
      return;
    }

    const trimmedInput = scanInput.trim();

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
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted">
                Assigned events
              </p>
              <h2 className="font-display text-2xl">Pick the active door context</h2>
            </div>

            <div className="space-y-3">
              {accessibleEvents.map((event) => {
                const isSelected = event.id === selectedEvent?.id;
                const membership = session?.user.memberships.find(
                  (candidate) => candidate.eventId === event.id && candidate.acceptedAt,
                );

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-success/40 bg-success/10"
                        : "border-border bg-black/10 hover:border-success/30 hover:bg-black/15"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            {membership ? formatScannerRole(membership.role) : "Assigned event"}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-foreground">
                            {event.title}
                          </h3>
                        </div>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/80">
                          {event.status}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-muted">
                        {event.venueName ?? "Venue pending"} · {formatDateTime(event.startsAt)}
                      </p>
                      <p className="text-sm text-muted">
                        {event.ticketTypes.length} ticket types configured
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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

                  <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">
                          Live validation
                        </p>
                        <h3 className="font-display text-2xl">
                          Validate the presented ticket now
                        </h3>
                        <p className="text-sm leading-6 text-muted">
                          Submit a QR token id or full signed QR payload. When connectivity is degraded,
                          the scanner falls back to manifest-based guidance and queues attempts for later sync.
                        </p>
                      </div>

                      <div className="grid gap-3">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            QR token id or signed payload
                          </span>
                          <textarea
                            value={scanInput}
                            onChange={(event) => setScanInput(event.target.value)}
                            rows={4}
                            placeholder="qr_seed_ga_0001 or eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-success/40"
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr]">
                          <label className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                              Ownership revision
                            </span>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={scanRevision}
                              onChange={(event) => setScanRevision(event.target.value)}
                              placeholder="1"
                              className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-success/40"
                            />
                          </label>

                          <div className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                              Scan session
                            </span>
                            <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground/90">
                              {scanSessionId ?? "A live scan session will be created on first validation or sync."}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={submitValidation}
                            disabled={isPending}
                            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                          >
                            {isPending
                              ? degradedMode
                                ? "Queueing..."
                                : "Validating..."
                              : degradedMode
                                ? "Queue degraded attempt"
                                : "Validate ticket"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScanInput("");
                              setScanRevision("");
                              setScanError(null);
                            }}
                            className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/30 hover:bg-black/10"
                          >
                            Clear input
                          </button>
                        </div>

                        {scanError ? (
                          <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                            {scanError}
                          </div>
                        ) : null}

                        {syncNotice ? (
                          <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
                            {syncNotice}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Recent outcome
                          </p>
                          <h3 className="font-display text-2xl">{outcomeHeading}</h3>
                        </div>

                        {latestOutcome ? (
                          <div
                            className={`rounded-[1.2rem] border px-4 py-4 ${
                              outcomeTone === "success"
                                ? "border-success/30 bg-success/10"
                                : outcomeTone === "accent"
                                  ? "border-accent-warm/30 bg-accent-warm/10"
                                  : "border-danger/30 bg-danger/10"
                            }`}
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/75">
                                {latestOutcome.outcome.replaceAll("_", " ")} · {latestOutcome.source === "DEGRADED" ? "Degraded mode" : "Live"}
                              </p>
                              <p className="text-base font-semibold text-foreground">
                                {outcomeExplanation}
                              </p>
                              <p className="text-sm text-foreground/80">
                                Serial: {latestOutcome.serialNumber ?? "Unavailable"} · Status:{" "}
                                {latestOutcome.currentStatus ?? "Unknown"} · {formatDateTime(latestOutcome.scannedAt)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
                            Run a scan to see the live or degraded scanner result here.
                          </div>
                        )}

                        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
                          {degradedMode
                            ? "Degraded mode avoids overstating confidence: the result is guidance from the last manifest, not authoritative live truth."
                            : "Each live result is phrased explicitly so door staff do not have to rely on color alone to decide whether entry should proceed."}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Quick picks
                          </p>
                          <h3 className="font-display text-2xl">Manifest-backed sample tickets</h3>
                          <p className="text-sm leading-6 text-muted">
                            Helpful for smoke testing the validation flow before camera scanning is added.
                          </p>
                        </div>

                        <div className="space-y-3">
                          {sampleTickets.map((ticket) => (
                            <button
                              key={`${ticket.serialNumber}-${ticket.ownershipRevision}`}
                              type="button"
                              onClick={() =>
                                loadSampleTicket(ticket.qrTokenId, ticket.ownershipRevision)
                              }
                              className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-left transition hover:border-success/30 hover:bg-black/20"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {ticket.serialNumber}
                              </p>
                              <p className="mt-1 text-sm text-muted">
                                {ticket.status} · rev {ticket.ownershipRevision}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Degraded recovery
                          </p>
                          <h3 className="font-display text-2xl">Queue and resync safely</h3>
                          <p className="text-sm leading-6 text-muted">
                            Attempts made without live connectivity are queued until you return to normal validation mode.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={syncDegradedAttempts}
                          disabled={isSyncPending || degradedMode || pendingSyncAttempts.length === 0}
                          className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/30 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {isSyncPending ? "Syncing queued attempts..." : "Sync queued attempts"}
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Connectivity
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Mode
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {degradedMode ? "Degraded" : "Live"}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                            Pending sync
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {pendingSyncAttempts.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                          Recent attempts
                        </p>
                        <h3 className="font-display text-2xl">Scanner line continuity</h3>
                      </div>

                      {recentAttempts.length > 0 ? (
                        <div className="space-y-3">
                          {recentAttempts.map((attempt, index) => (
                            <div
                              key={`${attempt.scanSessionId ?? "session"}-${attempt.scannedAt}-${attempt.serialNumber ?? "unknown"}-${index}`}
                              className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-3"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {attempt.outcome.replaceAll("_", " ")} · {attempt.serialNumber ?? "Unknown ticket"}
                                  </p>
                                  <p className="text-sm text-muted">
                                    {attempt.reasonCode} · {attempt.currentStatus ?? "Unknown status"} · {attempt.source === "DEGRADED" ? (attempt.syncState === "SYNCED" ? "Synced" : "Pending sync") : "Live"}
                                  </p>
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                                  {formatDateTime(attempt.scannedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
                          Recent attempts will appear here after each validation so staff can move cleanly from one scan to the next.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
