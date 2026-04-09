"use client";

import { apiFetch } from "@/lib/api/client";

export type OperationalTicketIssueDetail = {
  cancelledAt: string | null;
  currentOwner: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  event: {
    id: string;
    slug: string;
    startsAt: string;
    status: string;
    title: string;
  };
  id: string;
  issuedAt: string | null;
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
  resaleHistory: Array<{
    askingPrice: string;
    cancelledAt: string | null;
    createdAt: string;
    currency: string;
    id: string;
    listedAt: string | null;
    soldAt: string | null;
    status: string;
  }>;
  ownershipRevision: number;
  qrTokenId: string;
  refundedAt: string | null;
  reservedUntil: string | null;
  scanAttempts: Array<{
    deviceLabel: string | null;
    mode: string | null;
    outcome: string;
    reasonCode: string | null;
    scannedAt: string;
    scannedByEmail: string | null;
  }>;
  scanSummary: {
    lastScannedAt: string | null;
    latestOutcome: string | null;
    totalAttempts: number;
  };
  serialNumber: string;
  status: string;
  ticketType: {
    currency: string;
    id: string;
    name: string;
    price: string;
  };
  transferHistory: Array<{
    acceptedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    id: string;
    recipientEmail: string | null;
    status: string;
  }>;
  usedAt: string | null;
};

export async function getOperationalTicketIssue(
  eventId: string,
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<OperationalTicketIssueDetail>(
    `/api/tickets/events/${eventId}/${serialNumber}/issue`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}
