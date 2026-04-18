import { apiFetch } from "@/lib/api/client";
import type { AuthMembership } from "@/lib/auth/types";

export type ScannerEventSummary = {
  allowResale: boolean;
  description: string | null;
  endsAt: string | null;
  id: string;
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: Array<{
    id: string;
    isActive: boolean;
    name: string;
    price: string;
    quantity: number;
  }>;
  timezone: string;
  title: string;
  venueName: string | null;
};

export type ScannerManifestTicket = {
  ownerEmail: string;
  ownershipRevision: number;
  qrTokenId: string;
  serialNumber: string;
  status: string;
};

export type ScannerManifestResponse = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  generatedAt: string;
  manifestVersion: number;
  tickets: ScannerManifestTicket[];
};

export type ValidateScannerTicketPayload = {
  deviceFingerprint?: string;
  deviceLabel?: string;
  mode?: "ONLINE";
  qrPayload?: string;
  qrTokenId?: string;
  scanSessionId?: string;
  scannedRevision?: number;
};

export type ScannerValidationResponse = {
  currentStatus: string | null;
  outcome: "VALID" | "INVALID" | "ALREADY_USED" | "BLOCKED";
  reasonCode: string;
  scanSessionId: string | null;
  scannedAt: string;
  serialNumber: string | null;
  ticketId: string | null;
};

export type ScannerSyncAttempt = {
  deviceRecordedAt?: string;
  outcome: "VALID" | "INVALID" | "ALREADY_USED" | "BLOCKED";
  qrTokenId: string;
  reasonCode?: string;
  scannedAt: string;
  scannedRevision?: number;
};

export type ScannerSyncResponse = {
  acceptedCount: number;
  eventId: string;
  scanSessionId: string;
};

export async function listScannerEvents(accessToken: string) {
  return apiFetch<ScannerEventSummary[]>(
    "/api/events",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      sort: "asc",
    },
  );
}

export async function getScannerManifest(eventId: string, accessToken: string) {
  return apiFetch<ScannerManifestResponse>(`/api/scanner/events/${eventId}/manifest`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function validateScannerTicket(
  eventId: string,
  payload: ValidateScannerTicketPayload,
  accessToken: string,
) {
  return apiFetch<ScannerValidationResponse>(`/api/scanner/events/${eventId}/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function syncScannerAttempts(
  eventId: string,
  payload: {
    attempts: ScannerSyncAttempt[];
    deviceFingerprint?: string;
    deviceLabel?: string;
    mode?: "OFFLINE_SYNC";
    scanSessionId?: string;
  },
  accessToken: string,
) {
  return apiFetch<ScannerSyncResponse>(`/api/scanner/events/${eventId}/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getScannerAccessibleEventIds(memberships: AuthMembership[]) {
  return memberships
    .filter(
      (membership) =>
        Boolean(membership.acceptedAt) &&
        (membership.role === "OWNER" ||
          membership.role === "ADMIN" ||
          membership.role === "SCANNER"),
    )
    .map((membership) => membership.eventId);
}
