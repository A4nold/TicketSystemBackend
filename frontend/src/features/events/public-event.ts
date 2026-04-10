import { apiFetch } from "@/lib/api/client";

type ApiEventOrganizer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type ApiEventTicketType = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  quantity: number;
  maxPerOrder: number | null;
  isActive: boolean;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
};

type ApiEventDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venueName: string | null;
  venueAddress: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  coverImageUrl: string | null;
  allowResale: boolean;
  organizer: ApiEventOrganizer;
  ticketTypes: ApiEventTicketType[];
};

type ApiEventSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venueName: string | null;
  venueAddress: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  coverImageUrl: string | null;
  allowResale: boolean;
  organizer: ApiEventOrganizer;
  ticketTypes: ApiEventTicketType[];
  issuedTicketsCount: number;
};

type AvailabilityTone = "available" | "warning" | "unavailable";

export type PublicEventTicketType = {
  availabilityLabel: string;
  availabilityTone: AvailabilityTone;
  currency: string;
  description: string | null;
  id: string;
  isPurchasable: boolean;
  maxPerOrder: number | null;
  name: string;
  priceLabel: string;
  priceValue: number;
  quantity: number;
  quantityLabel: string;
  restrictionCopy: string;
  saleEndsAt: string | null;
  saleStartsAt: string | null;
};

export type PublicEventDetail = {
  allowResale: boolean;
  description: string | null;
  endsAt: string | null;
  id: string;
  organizerName: string;
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: PublicEventTicketType[];
  timezone: string;
  title: string;
  venueLabel: string;
};

export type PublicEventSummary = {
  allowResale: boolean;
  description: string | null;
  endsAt: string | null;
  id: string;
  issuedTicketsCount: number;
  organizerName: string;
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: PublicEventTicketType[];
  timezone: string;
  title: string;
  venueLabel: string;
};

function formatCurrency(price: string, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

function formatDateTime(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(date));
}

function formatDateRange(
  startsAt: string,
  endsAt: string | null,
  timezone: string,
) {
  const startLabel = new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));

  if (!endsAt) {
    return startLabel;
  }

  const endLabel = new Intl.DateTimeFormat("en-IE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(endsAt));

  return `${startLabel} to ${endLabel}`;
}

function getOrganizerName(organizer: ApiEventOrganizer) {
  const fullName = [organizer.firstName, organizer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || organizer.email;
}

function getVenueLabel(event: ApiEventDetail) {
  const label = [event.venueName, event.venueAddress].filter(Boolean).join(", ");

  return label || "Venue details to be confirmed";
}

function mapTicketAvailability(
  ticketType: ApiEventTicketType,
  timezone: string,
) {
  const now = Date.now();
  const saleStartsAt = ticketType.saleStartsAt ?? null;
  const saleEndsAt = ticketType.saleEndsAt ?? null;

  if (!ticketType.isActive) {
    return {
      availabilityLabel: "Unavailable",
      availabilityTone: "unavailable" as const,
      isPurchasable: false,
      restrictionCopy: "This ticket type is not currently available for sale.",
    };
  }

  if (saleStartsAt && now < new Date(saleStartsAt).getTime()) {
    return {
      availabilityLabel: "Coming soon",
      availabilityTone: "warning" as const,
      isPurchasable: false,
      restrictionCopy: `Sales open ${formatDateTime(saleStartsAt, timezone)}.`,
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
    restrictionCopy: "This ticket type can continue into checkout.",
  };
}

function mapPublicEventDetail(event: ApiEventDetail): PublicEventDetail {
  return {
    allowResale: event.allowResale,
    description: event.description,
    endsAt: event.endsAt,
    id: event.id,
    organizerName: getOrganizerName(event.organizer),
    slug: event.slug,
    startsAt: event.startsAt,
    status: event.status,
    timezone: event.timezone,
    title: event.title,
    venueLabel: getVenueLabel(event),
    ticketTypes: event.ticketTypes.map((ticketType) => {
      const availability = mapTicketAvailability(ticketType, event.timezone);

      return {
        ...availability,
        description: ticketType.description,
        currency: ticketType.currency,
        id: ticketType.id,
        maxPerOrder: ticketType.maxPerOrder,
        name: ticketType.name,
        priceLabel: formatCurrency(ticketType.price, ticketType.currency),
        priceValue: Number(ticketType.price),
        quantity: ticketType.quantity,
        quantityLabel: `${ticketType.quantity} tickets released`,
        saleEndsAt: ticketType.saleEndsAt ?? null,
        saleStartsAt: ticketType.saleStartsAt ?? null,
      };
    }),
  };
}

function mapPublicEventSummary(event: ApiEventSummary): PublicEventSummary {
  return {
    allowResale: event.allowResale,
    description: event.description,
    endsAt: event.endsAt,
    id: event.id,
    issuedTicketsCount: event.issuedTicketsCount,
    organizerName: getOrganizerName(event.organizer),
    slug: event.slug,
    startsAt: event.startsAt,
    status: event.status,
    timezone: event.timezone,
    title: event.title,
    venueLabel: getVenueLabel(event),
    ticketTypes: event.ticketTypes.map((ticketType) => {
      const availability = mapTicketAvailability(ticketType, event.timezone);

      return {
        ...availability,
        description: ticketType.description,
        currency: ticketType.currency,
        id: ticketType.id,
        maxPerOrder: ticketType.maxPerOrder,
        name: ticketType.name,
        priceLabel: formatCurrency(ticketType.price, ticketType.currency),
        priceValue: Number(ticketType.price),
        quantity: ticketType.quantity,
        quantityLabel: `${ticketType.quantity} tickets released`,
        saleEndsAt: ticketType.saleEndsAt ?? null,
        saleStartsAt: ticketType.saleStartsAt ?? null,
      };
    }),
  };
}

export async function listPublicEvents() {
  const events = await apiFetch<ApiEventSummary[]>("/api/events", {
    next: {
      revalidate: 60,
    },
  }, {
    sort: "asc",
  });

  return events.map(mapPublicEventSummary);
}

export async function getPublicEventBySlug(slug: string) {
  const event = await apiFetch<ApiEventDetail>(`/api/events/${slug}`, {
    next: {
      revalidate: 60,
    },
  });

  return mapPublicEventDetail(event);
}

export function formatEventWindow(event: Pick<PublicEventDetail, "startsAt" | "endsAt" | "timezone">) {
  return formatDateRange(event.startsAt, event.endsAt, event.timezone);
}

export function getTicketWindowLabel(
  ticketType: Pick<PublicEventTicketType, "saleStartsAt" | "saleEndsAt">,
  timezone: string,
) {
  if (ticketType.saleStartsAt && ticketType.saleEndsAt) {
    return `On sale ${formatDateTime(ticketType.saleStartsAt, timezone)} to ${formatDateTime(ticketType.saleEndsAt, timezone)}`;
  }

  if (ticketType.saleStartsAt) {
    return `On sale from ${formatDateTime(ticketType.saleStartsAt, timezone)}`;
  }

  if (ticketType.saleEndsAt) {
    return `Available until ${formatDateTime(ticketType.saleEndsAt, timezone)}`;
  }

  return "Standard sales window";
}

export function getAvailabilityClasses(tone: AvailabilityTone) {
  switch (tone) {
    case "available":
      return "border-success/30 bg-success/10 text-success";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning";
    case "unavailable":
      return "border-danger/30 bg-danger/10 text-danger";
  }
}
