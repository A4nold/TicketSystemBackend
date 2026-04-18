import { apiFetch } from "@/lib/api/client";

type ApiEventOrganizer = {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
};

type ApiEventTicketType = {
  currency: string;
  description: string | null;
  id: string;
  isActive: boolean;
  maxPerOrder: number | null;
  name: string;
  price: string;
  quantity: number;
  saleEndsAt?: string | null;
  saleStartsAt?: string | null;
};

type ApiEventDetail = {
  allowResale: boolean;
  coverImageUrl: string | null;
  description: string | null;
  endsAt: string | null;
  id: string;
  organizer: ApiEventOrganizer;
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: ApiEventTicketType[];
  timezone: string;
  title: string;
  venueAddress: string | null;
  venueName: string | null;
};

type ApiEventSummary = ApiEventDetail & {
  issuedTicketsCount: number;
};

export type PublicEventAvailabilityTone = "available" | "unavailable" | "warning";

export type PublicEventTicketType = {
  availabilityLabel: string;
  availabilityTone: PublicEventAvailabilityTone;
  currency: string;
  description: string | null;
  id: string;
  isPurchasable: boolean;
  maxPerOrder: number | null;
  name: string;
  priceLabel: string;
  priceValue: number;
  quantityLabel: string;
  restrictionCopy: string;
};

export type PublicEventSummary = {
  allowResale: boolean;
  coverImageUrl: string | null;
  description: string | null;
  endsAt: string | null;
  id: string;
  issuedTicketsCount: number;
  organizerName: string;
  scheduleLabel: string;
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: PublicEventTicketType[];
  timezone: string;
  title: string;
  venueLabel: string;
};

export type PublicEventDetail = Omit<PublicEventSummary, "issuedTicketsCount"> & {
  trustCopy: string;
};

function formatCurrency(price: string, currency: string) {
  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return `${price} ${currency}`;
  }

  return new Intl.NumberFormat("en-IE", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

function formatSchedule(startsAt: string, endsAt: string | null, timezone: string) {
  const startLabel = new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: timezone,
    weekday: "short",
  }).format(new Date(startsAt));

  if (!endsAt) {
    return startLabel;
  }

  const endLabel = new Intl.DateTimeFormat("en-IE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(endsAt));

  return `${startLabel} - ${endLabel}`;
}

function getOrganizerName(organizer: ApiEventOrganizer) {
  const fullName = [organizer.firstName, organizer.lastName].filter(Boolean).join(" ").trim();
  return fullName || organizer.email;
}

function getVenueLabel(event: ApiEventDetail) {
  const venueLabel = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return venueLabel || "Venue details to be confirmed";
}

function mapAvailability(ticketType: ApiEventTicketType, timezone: string) {
  const now = Date.now();
  const saleStartsAt = ticketType.saleStartsAt ?? null;
  const saleEndsAt = ticketType.saleEndsAt ?? null;

  if (!ticketType.isActive) {
    return {
      availabilityLabel: "Unavailable",
      availabilityTone: "unavailable" as const,
      isPurchasable: false,
      restrictionCopy: "This ticket type is not currently available.",
    };
  }

  if (saleStartsAt && now < new Date(saleStartsAt).getTime()) {
    const opensAt = new Intl.DateTimeFormat("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(saleStartsAt));

    return {
      availabilityLabel: "Coming soon",
      availabilityTone: "warning" as const,
      isPurchasable: false,
      restrictionCopy: `Sales open ${opensAt}.`,
    };
  }

  if (saleEndsAt && now > new Date(saleEndsAt).getTime()) {
    return {
      availabilityLabel: "Sales ended",
      availabilityTone: "unavailable" as const,
      isPurchasable: false,
      restrictionCopy: "This ticket type is no longer on sale.",
    };
  }

  return {
    availabilityLabel: "Available",
    availabilityTone: "available" as const,
    isPurchasable: true,
    restrictionCopy: "Continue from this event into sign-in or registration.",
  };
}

function mapTicketType(ticketType: ApiEventTicketType, timezone: string): PublicEventTicketType {
  const availability = mapAvailability(ticketType, timezone);

  return {
    ...availability,
    currency: ticketType.currency,
    description: ticketType.description,
    id: ticketType.id,
    maxPerOrder: ticketType.maxPerOrder,
    name: ticketType.name,
    priceLabel: formatCurrency(ticketType.price, ticketType.currency),
    priceValue: Number(ticketType.price),
    quantityLabel: `${ticketType.quantity} released`,
  };
}

function mapSummary(event: ApiEventSummary): PublicEventSummary {
  return {
    allowResale: event.allowResale,
    coverImageUrl: event.coverImageUrl,
    description: event.description,
    endsAt: event.endsAt,
    id: event.id,
    issuedTicketsCount: event.issuedTicketsCount,
    organizerName: getOrganizerName(event.organizer),
    scheduleLabel: formatSchedule(event.startsAt, event.endsAt, event.timezone),
    slug: event.slug,
    startsAt: event.startsAt,
    status: event.status,
    ticketTypes: event.ticketTypes.map((ticketType) => mapTicketType(ticketType, event.timezone)),
    timezone: event.timezone,
    title: event.title,
    venueLabel: getVenueLabel(event),
  };
}

function mapDetail(event: ApiEventDetail): PublicEventDetail {
  return {
    allowResale: event.allowResale,
    coverImageUrl: event.coverImageUrl,
    description: event.description,
    endsAt: event.endsAt,
    id: event.id,
    organizerName: getOrganizerName(event.organizer),
    scheduleLabel: formatSchedule(event.startsAt, event.endsAt, event.timezone),
    slug: event.slug,
    startsAt: event.startsAt,
    status: event.status,
    ticketTypes: event.ticketTypes.map((ticketType) => mapTicketType(ticketType, event.timezone)),
    timezone: event.timezone,
    title: event.title,
    trustCopy: event.allowResale
      ? "Tickets, transfers, and resale activity stay connected inside the same wallet experience."
      : "Tickets stay on the primary ownership path, with entry status managed inside the wallet.",
    venueLabel: getVenueLabel(event),
  };
}

export async function listPublicEvents() {
  const response = await apiFetch<ApiEventSummary[]>("/api/events", undefined, {
    sort: "asc",
  });

  return response.map(mapSummary);
}

export async function getPublicEventBySlug(slug: string) {
  const response = await apiFetch<ApiEventDetail>(`/api/events/${slug}`);
  return mapDetail(response);
}
