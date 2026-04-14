import { Prisma } from "@prisma/client";

function getAvailablePostEventContent(event: {
  endsAt?: Date | null;
  postEventCtaLabel?: string | null;
  postEventCtaUrl?: string | null;
  postEventMessage?: string | null;
  postEventPublishedAt?: Date | null;
  startsAt: Date;
}) {
  const eventEndTime = event.endsAt ?? event.startsAt;

  if (
    !event.postEventMessage ||
    !event.postEventPublishedAt ||
    event.postEventPublishedAt > new Date() ||
    eventEndTime > new Date()
  ) {
    return null;
  }

  return {
    ctaLabel: event.postEventCtaLabel ?? null,
    ctaUrl: event.postEventCtaUrl ?? null,
    message: event.postEventMessage,
    publishedAt: event.postEventPublishedAt,
  };
}

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
    minResalePrice?: Prisma.Decimal | null;
    maxResalePrice?: Prisma.Decimal | null;
    resaleRoyaltyPercent?: Prisma.Decimal | null;
    resaleStartsAt?: Date | null;
    resaleEndsAt?: Date | null;
    endsAt?: Date | null;
    postEventMessage?: string | null;
    postEventCtaLabel?: string | null;
    postEventCtaUrl?: string | null;
    postEventPublishedAt?: Date | null;
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
    organizerRoyaltyAmount?: Prisma.Decimal | null;
    sellerNetAmount?: Prisma.Decimal | null;
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
    reminderSentAt: Date | null;
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
      postEventContent: getAvailablePostEventContent(ticket.event),
      resalePolicy: {
        minResalePrice: ticket.event.minResalePrice?.toFixed(2) ?? null,
        maxResalePrice: ticket.event.maxResalePrice?.toFixed(2) ?? null,
        resaleRoyaltyPercent: ticket.event.resaleRoyaltyPercent?.toFixed(2) ?? null,
        startsAt: ticket.event.resaleStartsAt ?? null,
        endsAt: ticket.event.resaleEndsAt ?? null,
      },
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
          reminderSentAt: latestTransfer.reminderSentAt,
          acceptedAt: latestTransfer.acceptedAt,
          cancelledAt: latestTransfer.cancelledAt,
        }
      : null,
    latestResaleListing: latestResaleListing
      ? {
          id: latestResaleListing.id,
          status: latestResaleListing.status,
          askingPrice: latestResaleListing.askingPrice.toFixed(2),
          currency: latestResaleListing.currency,
          organizerRoyaltyAmount:
            latestResaleListing.organizerRoyaltyAmount?.toFixed(2) ?? null,
          sellerNetAmount: latestResaleListing.sellerNetAmount?.toFixed(2) ?? null,
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
      reminderSentAt: transfer.reminderSentAt,
    })),
    resaleHistory: ticket.resaleListings.map((listing) => ({
      id: listing.id,
      status: listing.status,
      askingPrice: listing.askingPrice.toFixed(2),
      currency: listing.currency,
      organizerRoyaltyAmount: listing.organizerRoyaltyAmount?.toFixed(2) ?? null,
      sellerNetAmount: listing.sellerNetAmount?.toFixed(2) ?? null,
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
