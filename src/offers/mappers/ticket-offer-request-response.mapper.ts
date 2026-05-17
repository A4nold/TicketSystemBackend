import { Prisma } from "@prisma/client";

type TicketOfferRequestResponseSource = {
  id: string;
  eventId: string;
  ticketTypeId: string;
  attendeeUserId: string;
  offeredPrice: Prisma.Decimal;
  currency: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  organizerNote: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  expiresAt: Date;
  checkoutUnlockToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  attendeeUser: {
    id: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  ticketType: {
    id: string;
    name: string;
  };
};

export function toTicketOfferRequestResponse(
  offerRequest: TicketOfferRequestResponseSource,
) {
  return {
    id: offerRequest.id,
    eventId: offerRequest.eventId,
    ticketTypeId: offerRequest.ticketTypeId,
    attendeeUserId: offerRequest.attendeeUserId,
    offeredPrice: offerRequest.offeredPrice.toFixed(2),
    currency: offerRequest.currency,
    status: offerRequest.status,
    organizerNote: offerRequest.organizerNote,
    reviewedByUserId: offerRequest.reviewedByUserId,
    reviewedAt: offerRequest.reviewedAt,
    expiresAt: offerRequest.expiresAt,
    checkoutUnlockToken: offerRequest.checkoutUnlockToken,
    createdAt: offerRequest.createdAt,
    updatedAt: offerRequest.updatedAt,
    ticketType: {
      id: offerRequest.ticketType.id,
      name: offerRequest.ticketType.name,
    },
    attendeeUser: {
      id: offerRequest.attendeeUser.id,
      email: offerRequest.attendeeUser.email,
      firstName: offerRequest.attendeeUser.profile?.firstName ?? null,
      lastName: offerRequest.attendeeUser.profile?.lastName ?? null,
    },
  };
}

