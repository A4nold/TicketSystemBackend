import type {
  ScannerManifestResponse,
  ScannerValidationResponse,
} from "@/lib/scanner/scanner-client";

export type ScannerAttemptRecord = {
  currentStatus: string | null;
  outcome: "VALID" | "ALREADY_USED" | "INVALID" | "BLOCKED";
  reasonCode: string;
  scanSessionId: string | null;
  scannedAt: string;
  serialNumber: string | null;
  ticketId: string | null;
  source: "DEGRADED" | "ONLINE";
  syncState: "NONE" | "PENDING_SYNC" | "SYNCED";
};

export function buildDegradedAttempt(
  input: string,
  revision: string,
  manifest: ScannerManifestResponse | undefined,
  scanSessionId: string | null,
): ScannerAttemptRecord {
  const trimmedInput = input.trim();
  const manifestTicket = manifest?.tickets.find((ticket) => ticket.qrTokenId === trimmedInput) ?? null;
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

export function toScannerAttemptRecord(
  response: ScannerValidationResponse,
): ScannerAttemptRecord {
  return {
    ...response,
    source: "ONLINE",
    syncState: "NONE",
  };
}

export function getOutcomeHeading(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Ready to scan";
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
      return "Ticket blocked";
    case "INVALID":
      return "Ticket invalid";
  }
}

export function getOutcomeOperatorInstruction(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Point the camera at a ticket QR or enter a token manually.";
  }

  if (attempt.source === "DEGRADED") {
    switch (attempt.outcome) {
      case "VALID":
        return "Admit with caution and sync this lane as soon as service returns.";
      case "ALREADY_USED":
        return "Do not admit again unless a supervisor confirms an exception.";
      case "BLOCKED":
        return "Hold the guest and verify with an organizer or supervisor.";
      case "INVALID":
        return "Ask for the latest ticket or route this guest to support.";
    }
  }

  switch (attempt.outcome) {
    case "VALID":
      return "Admit guest now.";
    case "ALREADY_USED":
      return "Do not admit again.";
    case "BLOCKED":
      return "Hold entry and escalate to the event team.";
    case "INVALID":
      return "Do not admit. Ask the guest to present a valid ticket.";
  }
}

export function getOutcomeDecisionLabel(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Waiting";
  }

  if (attempt.source === "DEGRADED" && attempt.outcome === "VALID") {
    return "Admit with caution";
  }

  switch (attempt.outcome) {
    case "VALID":
      return "Admit";
    case "ALREADY_USED":
      return "Already used";
    case "BLOCKED":
      return "Hold";
    case "INVALID":
      return "Deny";
  }
}

export function getOutcomeExplanation(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "Scan a ticket to see the latest validation outcome here.";
  }

  if (attempt.source === "DEGRADED") {
    switch (attempt.reasonCode) {
      case "degraded_manifest_ready":
        return "The last prepared manifest shows this ticket as ready, but live confirmation is unavailable.";
      case "degraded_manifest_used":
        return "The last prepared manifest already showed this ticket as used.";
      case "degraded_manifest_blocked":
        return "The last prepared manifest showed this ticket in a blocked state for entry.";
      case "degraded_manifest_stale_revision":
        return "The presented ticket revision does not match the latest prepared manifest.";
      default:
        return "This ticket could not be matched confidently from the prepared manifest.";
    }
  }

  switch (attempt.reasonCode) {
    case "first_entry":
      return "This ticket is valid and has now been marked as used.";
    case "already_used":
      return "This ticket has already been scanned for entry.";
    case "ticket_not_eligible":
      return "This ticket is not currently eligible for entry.";
    case "stale_revision":
      return "The presented code is tied to an outdated ownership revision.";
    case "unknown_qr":
      return "The presented code does not match a known ticket for this event.";
    default:
      return "Review this result before admitting entry.";
  }
}

export function getOutcomeTone(attempt: ScannerAttemptRecord | null) {
  if (!attempt) {
    return "default" as const;
  }

  if (attempt.outcome === "VALID") {
    return "success" as const;
  }

  if (attempt.outcome === "BLOCKED") {
    return "accent" as const;
  }

  return "warning" as const;
}
