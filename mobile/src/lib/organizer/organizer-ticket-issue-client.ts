import { apiFetch } from "@/lib/api/client";

export type OrganizerTicketIssueDetail = {
  cancelledAt: string | null;
  currentOwner: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  event: {
    id: string;
    postEventContent: {
      ctaLabel: string | null;
      ctaUrl: string | null;
      message: string | null;
      publishedAt: string | null;
    } | null;
    resalePolicy: {
      endsAt: string | null;
      maxResalePrice: string | null;
      minResalePrice: string | null;
      resaleRoyaltyPercent: string | null;
      startsAt: string | null;
    } | null;
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
    organizerRoyaltyAmount: string | null;
    sellerNetAmount: string | null;
    soldAt: string | null;
    status: string;
  } | null;
  latestTransfer: {
    acceptedAt: string | null;
    cancelledAt: string | null;
    expiresAt: string;
    id: string;
    recipientEmail: string | null;
    senderUserId: string;
    status: string;
  } | null;
  ownershipHistory: Array<{
    changeType: string;
    createdAt: string;
    fromEmail: string | null;
    revision: number;
    toEmail: string | null;
  }>;
  ownershipRevision: number;
  qrTokenId: string;
  refundedAt: string | null;
  resaleHistory: Array<{
    askingPrice: string;
    cancelledAt: string | null;
    createdAt: string;
    currency: string;
    id: string;
    listedAt: string | null;
    organizerRoyaltyAmount: string | null;
    sellerNetAmount: string | null;
    soldAt: string | null;
    status: string;
  }>;
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
    senderUserId: string;
    status: string;
  }>;
  usedAt: string | null;
};

export async function getOrganizerTicketIssueDetail(
  eventId: string,
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<OrganizerTicketIssueDetail>(
    `/api/tickets/events/${eventId}/${serialNumber}/issue`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}
