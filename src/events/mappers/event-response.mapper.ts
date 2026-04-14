import { Prisma } from "@prisma/client";

type EventOrganizerShape = {
  id: string;
  email: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

type EventTicketTypeShape = {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  currency: string;
  quantity: number;
  maxPerOrder: number | null;
  isActive: boolean;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
};

type EventStaffMembershipShape = {
  id: string;
  role: string;
  invitedAt: Date | null;
  acceptedAt: Date | null;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
};

export type EventSummarySource = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venueName: string | null;
  venueAddress: string | null;
  timezone: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  coverImageUrl: string | null;
  allowResale: boolean;
  resaleStartsAt: Date | null;
  resaleEndsAt: Date | null;
  minResalePrice?: Prisma.Decimal | null;
  maxResalePrice?: Prisma.Decimal | null;
  resaleRoyaltyPercent?: Prisma.Decimal | null;
  postEventMessage?: string | null;
  postEventCtaLabel?: string | null;
  postEventCtaUrl?: string | null;
  postEventPublishedAt?: Date | null;
  organizer: EventOrganizerShape;
  ticketTypes: EventTicketTypeShape[];
  _count: {
    tickets: number;
  };
};

export type EventDetailSource = EventSummarySource & {
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  staffMemberships: EventStaffMembershipShape[];
  _count: {
    tickets: number;
    scanAttempts: number;
    resaleListings: number;
  };
};

export function toTicketTypeResponse(ticketType: EventTicketTypeShape) {
  return {
    id: ticketType.id,
    name: ticketType.name,
    description: ticketType.description,
    price: ticketType.price.toFixed(2),
    currency: ticketType.currency,
    quantity: ticketType.quantity,
    maxPerOrder: ticketType.maxPerOrder,
    isActive: ticketType.isActive,
    saleStartsAt: ticketType.saleStartsAt ?? null,
    saleEndsAt: ticketType.saleEndsAt ?? null,
  };
}

export function toStaffMembershipResponse(membership: EventStaffMembershipShape) {
  return {
    id: membership.id,
    role: membership.role,
    invitedAt: membership.invitedAt,
    acceptedAt: membership.acceptedAt,
    user: {
      id: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.profile?.firstName ?? null,
      lastName: membership.user.profile?.lastName ?? null,
    },
  };
}

export function toEventSummaryResponse(event: EventSummarySource) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    timezone: event.timezone,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    coverImageUrl: event.coverImageUrl,
    allowResale: event.allowResale,
    resaleWindow: {
      startsAt: event.resaleStartsAt,
      endsAt: event.resaleEndsAt,
      minResalePrice: event.minResalePrice?.toFixed(2) ?? null,
      maxResalePrice: event.maxResalePrice?.toFixed(2) ?? null,
      resaleRoyaltyPercent: event.resaleRoyaltyPercent?.toFixed(2) ?? null,
    },
    organizer: {
      id: event.organizer.id,
      email: event.organizer.email,
      firstName: event.organizer.profile?.firstName ?? null,
      lastName: event.organizer.profile?.lastName ?? null,
    },
    ticketTypes: event.ticketTypes.map((ticketType) => toTicketTypeResponse(ticketType)),
    issuedTicketsCount: event._count.tickets,
  };
}

export function toEventDetailResponse(event: EventDetailSource) {
  return {
    ...toEventSummaryResponse(event),
    salesWindow: {
      startsAt: event.salesStartAt,
      endsAt: event.salesEndAt,
    },
    resalePolicy: {
      allowResale: event.allowResale,
      minResalePrice: event.minResalePrice?.toFixed(2) ?? null,
      maxResalePrice: event.maxResalePrice?.toFixed(2) ?? null,
      resaleRoyaltyPercent: event.resaleRoyaltyPercent?.toFixed(2) ?? null,
      startsAt: event.resaleStartsAt,
      endsAt: event.resaleEndsAt,
    },
    postEventContent: {
      message: event.postEventMessage ?? null,
      ctaLabel: event.postEventCtaLabel ?? null,
      ctaUrl: event.postEventCtaUrl ?? null,
      publishedAt: event.postEventPublishedAt ?? null,
    },
    staff: event.staffMemberships.map((membership) =>
      toStaffMembershipResponse(membership),
    ),
    metrics: {
      tickets: event._count.tickets,
      scanAttempts: event._count.scanAttempts,
      resaleListings: event._count.resaleListings,
    },
  };
}
