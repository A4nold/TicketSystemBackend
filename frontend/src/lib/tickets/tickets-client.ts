"use client";

import { apiFetch } from "@/lib/api/client";

export type OwnedTicketSummary = {
  id: string;
  serialNumber: string;
  qrTokenId: string;
  status: string;
  ownershipRevision: number;
  issuedAt: string | null;
  usedAt: string | null;
  event: {
    id: string;
    slug: string;
    startsAt: string;
    status: string;
    title: string;
  };
  ticketType: {
    currency: string;
    id: string;
    name: string;
    price: string;
  };
  currentOwner: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  scanSummary: {
    lastScannedAt: string | null;
    latestOutcome: string | null;
    totalAttempts: number;
  };
};

export type OwnedTicketDetail = OwnedTicketSummary & {
  cancelledAt: string | null;
  latestResaleListing: {
    askingPrice: string;
    currency: string;
    id: string;
    listedAt: string | null;
    soldAt: string | null;
    status: string;
  } | null;
  latestTransfer: {
    acceptedAt: string | null;
    expiresAt: string;
    id: string;
    recipientEmail: string | null;
    status: string;
  } | null;
  ownershipHistory: Array<{
    changeType: string;
    createdAt: string;
    fromEmail: string | null;
    revision: number;
    toEmail: string | null;
  }>;
  refundedAt: string | null;
  reservedUntil: string | null;
};

export type OwnedTicketQrPayload = {
  eventId: string;
  eventSlug: string;
  expiresAt: string | null;
  generatedAt: string;
  ownershipRevision: number;
  qrTokenId: string;
  serialNumber: string;
  signedToken: string;
  tokenType: string;
};

export async function listOwnedTickets(
  accessToken: string,
  query?: {
    eventSlug?: string;
    sort?: "asc" | "desc";
    status?: string;
  },
) {
  return apiFetch<OwnedTicketSummary[]>(
    "/api/tickets/me/owned",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    query,
  );
}

export async function getOwnedTicketBySerialNumber(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<OwnedTicketDetail>(`/api/tickets/me/owned/${serialNumber}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getOwnedTicketQrPayload(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<OwnedTicketQrPayload>(`/api/me/tickets/${serialNumber}/qr`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
