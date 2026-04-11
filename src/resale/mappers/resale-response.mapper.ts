import { Prisma, ResaleStatus, TicketStatus } from "@prisma/client";

export function toResaleResponse(
  listing: {
    id: string;
    ticketId: string;
    eventId: string;
    sellerUserId: string;
    buyerUserId: string | null;
    status: ResaleStatus;
    askingPrice: Prisma.Decimal;
    currency: string;
    saleReference: string | null;
    listedAt: Date | null;
    soldAt: Date | null;
    expiresAt: Date | null;
    cancelledAt: Date | null;
  },
  serialNumber: string,
  ticketStatus: TicketStatus,
  ownershipRevision: number,
) {
  return {
    id: listing.id,
    ticketId: listing.ticketId,
    serialNumber,
    eventId: listing.eventId,
    sellerUserId: listing.sellerUserId,
    buyerUserId: listing.buyerUserId,
    status: listing.status,
    askingPrice: listing.askingPrice.toString(),
    currency: listing.currency,
    saleReference: listing.saleReference,
    listedAt: listing.listedAt,
    soldAt: listing.soldAt,
    expiresAt: listing.expiresAt,
    cancelledAt: listing.cancelledAt,
    ticketStatus,
    ownershipRevision,
  };
}
