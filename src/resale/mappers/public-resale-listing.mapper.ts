import { Prisma } from "@prisma/client";

type PublicResaleListingSource = {
  id: string;
  askingPrice: Prisma.Decimal;
  currency: string;
  listedAt: Date | null;
  expiresAt: Date | null;
  status: string;
  event: {
    id: string;
    slug: string;
    startsAt: Date;
    title: string;
  };
  ticket: {
    serialNumber: string;
    ticketType: {
      id: string;
      name: string;
    };
  };
};

export function toPublicResaleListingResponse(listing: PublicResaleListingSource) {
  return {
    askingPrice: listing.askingPrice.toString(),
    currency: listing.currency,
    event: {
      id: listing.event.id,
      slug: listing.event.slug,
      startsAt: listing.event.startsAt,
      title: listing.event.title,
    },
    expiresAt: listing.expiresAt,
    id: listing.id,
    listedAt: listing.listedAt,
    serialNumber: listing.ticket.serialNumber,
    status: listing.status,
    ticketType: {
      id: listing.ticket.ticketType.id,
      name: listing.ticket.ticketType.name,
    },
  };
}
