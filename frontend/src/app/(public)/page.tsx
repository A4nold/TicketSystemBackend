import { PublicHomeDiscoverySections } from "@/features/public/home/public-home-discovery-sections";
import { PublicHomeHero } from "@/features/public/home/public-home-hero";
import type { MarketplaceEventCardModel } from "@/features/public/marketplace/marketplace-event-card";
import { apiFetch } from "@/lib/api/client";

type ApiEventOrganizer = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type ApiEventTicketType = {
  id: string;
  name: string;
  price: string;
  currency: string;
  isActive: boolean;
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

const proofPoints = [
  "Upcoming campus events surfaced first",
  "Straight-to-wallet ticket delivery",
  "Protected transfer and resale flows",
];

const spotlightStats = [
  {
    label: "What you can do",
    value: "Discover, buy, transfer, and resell",
  },
  {
    label: "Attendee focus",
    value: "Wallet-ready tickets across multiple events",
  },
  {
    label: "Operations",
    value: "Organizer and scanner tooling stays protected",
  },
];

function formatCurrency(price: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatEventDate(startsAt: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function getVenueLabel(event: ApiEventSummary) {
  const venue = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return venue || "Venue details to be confirmed";
}

function getLowestActivePriceLabel(ticketTypes: ApiEventTicketType[]) {
  const activePrices = ticketTypes
    .filter((ticketType) => ticketType.isActive)
    .map((ticketType) => Number(ticketType.price))
    .sort((left, right) => left - right);

  if (!activePrices.length) {
    return "Tickets unavailable";
  }

  return `From ${formatCurrency(activePrices[0], ticketTypes[0]?.currency ?? "EUR")}`;
}

function getOrganizerName(organizer: ApiEventOrganizer) {
  const fullName = [organizer.firstName, organizer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || organizer.email;
}

function mapMarketplaceEvent(event: ApiEventSummary): MarketplaceEventCardModel {
  const eventStart = new Date(event.startsAt).getTime();
  const now = Date.now();
  const daysUntilStart = (eventStart - now) / (1000 * 60 * 60 * 24);

  return {
    description:
      event.description?.trim() ||
      `Hosted by ${getOrganizerName(event.organizer)} for attendees who want a cleaner, wallet-ready ticketing flow.`,
    href: `/events/${event.slug}`,
    id: event.id,
    isSoon: daysUntilStart <= 10,
    issuedTicketsCount: event.issuedTicketsCount,
    lowestPriceLabel: getLowestActivePriceLabel(event.ticketTypes),
    resaleLabel: event.allowResale ? "Resale enabled" : "Primary sale only",
    startLabel: formatEventDate(event.startsAt, event.timezone),
    statusLabel: event.status.toLowerCase().replaceAll("_", " "),
    title: event.title,
    venueLabel: getVenueLabel(event),
  };
}

async function getMarketplaceEvents() {
  try {
    const events = await apiFetch<ApiEventSummary[]>("/api/events", {
      next: {
        revalidate: 60,
      },
    }, {
      sort: "asc",
    });

    return events.map(mapMarketplaceEvent);
  } catch {
    return [];
  }
}

export default async function PublicHomePage() {
  const marketplaceEvents = await getMarketplaceEvents();
  const [featuredEvent, ...remainingEvents] = marketplaceEvents;
  const upcomingEvents = remainingEvents.slice(0, 6);

  return (
    <div className="space-y-8 sm:space-y-10">
      <PublicHomeHero proofPoints={proofPoints} spotlightStats={spotlightStats} />
      <PublicHomeDiscoverySections
        featuredEvent={featuredEvent}
        upcomingEvents={upcomingEvents}
      />
    </div>
  );
}
