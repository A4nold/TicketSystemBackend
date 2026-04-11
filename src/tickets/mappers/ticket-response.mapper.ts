import { Prisma } from "@prisma/client";

type TicketSummarySource = {
  id: string;
  serialNumber: string;
  qrTokenId: string;
  status: string;
  ownershipRevision: number;
  issuedAt: Date | null;
  usedAt: Date | null;
  event: {
    id: string;
    slug: string;
    title: string;
    status: string;
    startsAt: Date;
  };
  ticketType: {
    id: string;
    name: string;
    price: Prisma.Decimal;
    currency: string;
  };
  currentOwner: {
    id: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  scanAttempts: Array<{
    outcome: string;
    scannedAt: Date;
  }>;
};

type TicketDetailSource = Omit<TicketSummarySource, "scanAttempts"> & {
  reservedUntil: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  resaleListings: Array<{
    id: string;
    status: string;
    askingPrice: Prisma.Decimal;
    currency: string;
    createdAt: Date;
    listedAt: Date | null;
    soldAt: Date | null;
    cancelledAt: Date | null;
  }>;
  scanAttempts: Array<{
    outcome: string;
    reasonCode: string | null;
    scannedAt: Date;
    scannedByUser: {
      email: string;
    } | null;
    scanSession: {
      deviceLabel: string | null;
      mode: string;
    } | null;
  }>;
  ownershipHistory: Array<{
    changeType: string;
    revision: number;
    fromUser: {
      email: string;
    } | null;
    toUser: {
      email: string;
    } | null;
    createdAt: Date;
  }>;
  transferRequests: Array<{
    id: string;
    status: string;
    senderUserId: string;
    recipientEmail: string | null;
    createdAt: Date;
    acceptedAt: Date | null;
    cancelledAt: Date | null;
    expiresAt: Date;
  }>;
};

export function toTicketSummaryResponse(ticket: TicketSummarySource) {
  return {
    id: ticket.id,
    serialNumber: ticket.serialNumber,
    qrTokenId: ticket.qrTokenId,
    status: ticket.status,
    ownershipRevision: ticket.ownershipRevision,
    issuedAt: ticket.issuedAt,
    usedAt: ticket.usedAt,
    event: {
      id: ticket.event.id,
      slug: ticket.event.slug,
      title: ticket.event.title,
      status: ticket.event.status,
      startsAt: ticket.event.startsAt,
    },
    ticketType: {
      id: ticket.ticketType.id,
      name: ticket.ticketType.name,
      price: ticket.ticketType.price.toFixed(2),
      currency: ticket.ticketType.currency,
    },
    currentOwner: {
      id: ticket.currentOwner.id,
      email: ticket.currentOwner.email,
      firstName: ticket.currentOwner.profile?.firstName ?? null,
      lastName: ticket.currentOwner.profile?.lastName ?? null,
    },
    scanSummary: {
      totalAttempts: ticket.scanAttempts.length,
      latestOutcome: ticket.scanAttempts[0]?.outcome ?? null,
      lastScannedAt: ticket.scanAttempts[0]?.scannedAt ?? null,
    },
  };
}

export function toTicketDetailResponse(ticket: TicketDetailSource) {
  const latestTransfer = ticket.transferRequests[0] ?? null;
  const latestResaleListing = ticket.resaleListings[0] ?? null;

  return {
    ...toTicketSummaryResponse(ticket),
    reservedUntil: ticket.reservedUntil,
    cancelledAt: ticket.cancelledAt,
    refundedAt: ticket.refundedAt,
    latestTransfer: latestTransfer
      ? {
          id: latestTransfer.id,
          status: latestTransfer.status,
          senderUserId: latestTransfer.senderUserId,
          recipientEmail: latestTransfer.recipientEmail,
          expiresAt: latestTransfer.expiresAt,
          acceptedAt: latestTransfer.acceptedAt,
        }
      : null,
    latestResaleListing: latestResaleListing
      ? {
          id: latestResaleListing.id,
          status: latestResaleListing.status,
          askingPrice: latestResaleListing.askingPrice.toFixed(2),
          currency: latestResaleListing.currency,
          listedAt: latestResaleListing.listedAt,
          soldAt: latestResaleListing.soldAt,
        }
      : null,
    ownershipHistory: ticket.ownershipHistory.map((historyItem) => ({
      changeType: historyItem.changeType,
      revision: historyItem.revision,
      fromEmail: historyItem.fromUser?.email ?? null,
      toEmail: historyItem.toUser?.email ?? null,
      createdAt: historyItem.createdAt,
    })),
    transferHistory: ticket.transferRequests.map((transfer) => ({
      id: transfer.id,
      status: transfer.status,
      senderUserId: transfer.senderUserId,
      recipientEmail: transfer.recipientEmail,
      createdAt: transfer.createdAt,
      acceptedAt: transfer.acceptedAt,
      cancelledAt: transfer.cancelledAt,
    })),
    resaleHistory: ticket.resaleListings.map((listing) => ({
      id: listing.id,
      status: listing.status,
      askingPrice: listing.askingPrice.toFixed(2),
      currency: listing.currency,
      createdAt: listing.createdAt,
      listedAt: listing.listedAt,
      soldAt: listing.soldAt,
      cancelledAt: listing.cancelledAt,
    })),
    scanAttempts: ticket.scanAttempts.map((attempt) => ({
      outcome: attempt.outcome,
      reasonCode: attempt.reasonCode,
      scannedAt: attempt.scannedAt,
      deviceLabel: attempt.scanSession?.deviceLabel ?? null,
      mode: attempt.scanSession?.mode ?? null,
      scannedByEmail: attempt.scannedByUser?.email ?? null,
    })),
  };
}
