import Link from "next/link";

import { Panel } from "@/components/ui/panel";
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

type MarketplaceEvent = {
  description: string;
  href: string;
  id: string;
  isSoon: boolean;
  issuedTicketsCount: number;
  lowestPriceLabel: string;
  resaleLabel: string;
  startLabel: string;
  statusLabel: string;
  title: string;
  venueLabel: string;
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

function mapMarketplaceEvent(event: ApiEventSummary): MarketplaceEvent {
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

function EventCard({
  event,
  featured = false,
}: {
  event: MarketplaceEvent;
  featured?: boolean;
}) {
  return (
    <Link
      href={event.href}
      className={`group rounded-[1.6rem] border border-border bg-white/5 transition hover:border-accent/50 hover:bg-white/8 ${
        featured ? "p-6 md:p-7" : "p-5"
      }`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          <span
            className={`rounded-full border px-3 py-1 ${
              event.isSoon
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-black/10 text-muted"
            }`}
          >
            {event.isSoon ? "Happening soon" : event.statusLabel}
          </span>
          <span className="rounded-full border border-border bg-black/10 px-3 py-1">
            {event.resaleLabel}
          </span>
        </div>

        <div className="space-y-2">
          <h3
            className={`font-display leading-tight text-foreground ${
              featured ? "text-3xl sm:text-4xl" : "text-2xl"
            }`}
          >
            {event.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {event.description}
          </p>
        </div>

        <dl className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">When</dt>
            <dd className="mt-2 text-foreground">{event.startLabel}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">Where</dt>
            <dd className="mt-2 text-foreground">{event.venueLabel}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">Tickets</dt>
            <dd className="mt-2 text-foreground">{event.lowestPriceLabel}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            {event.issuedTicketsCount} tickets already issued
          </span>
          <span className="font-medium text-foreground transition group-hover:translate-x-1">
            View event →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function PublicHomePage() {
  const marketplaceEvents = await getMarketplaceEvents();
  const [featuredEvent, ...remainingEvents] = marketplaceEvents;
  const upcomingEvents = remainingEvents.slice(0, 6);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,125,93,0.18),rgba(54,216,202,0.12),rgba(8,17,31,0.8))] px-6 py-8 shadow-[0_24px_90px_rgba(2,8,20,0.34)] sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(54,216,202,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,125,93,0.16),transparent_28%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)] lg:items-end">
          <div className="space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent">
              Live event marketplace
            </p>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-4xl leading-tight text-balance sm:text-5xl lg:text-6xl">
                Discover upcoming events, secure your ticket, and keep every pass in one wallet.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                Built for modern event buying, with protected ownership, transfer-aware delivery, and a resale layer that still feels like part of the same product.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
              >
                Browse upcoming events
              </Link>
              <Link
                href="/marketplace"
                className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/12"
              >
                Explore resale marketplace
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="rounded-full border border-white/12 bg-black/15 px-3 py-1.5 text-sm text-slate-100"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {spotlightStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.4rem] border border-white/12 bg-black/15 p-4 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-accent-warm">
                  {stat.label}
                </p>
                <p className="mt-2 text-base leading-6 text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredEvent ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
                Featured next up
              </p>
              <h2 className="font-display text-3xl">Events happening soon</h2>
            </div>
            <Link href="/events" className="text-sm font-medium text-muted transition hover:text-foreground">
              View all events
            </Link>
          </div>
          <EventCard event={featuredEvent} featured />
        </section>
      ) : (
        <Panel className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Marketplace is warming up
          </p>
          <h2 className="font-display text-3xl">No public events are live yet.</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Organizers can publish events from the organizer workspace, and they will appear here once ready for discovery.
          </p>
        </Panel>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
        <Panel className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
              Upcoming events
            </p>
            <h2 className="font-display text-3xl">Choose your next event night.</h2>
          </div>
          {upcomingEvents.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">
              More events will appear here as new organizers publish upcoming listings.
            </p>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
              Your account after login
            </p>
            <h2 className="font-display text-2xl">Wallet-first ticket ownership.</h2>
            <p className="text-sm leading-6 text-muted">
              Buyers keep tickets, QR access, transfers, and resale actions in one attendee wallet across multiple events.
            </p>
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-accent"
            >
              Open wallet surface
              <span aria-hidden="true">→</span>
            </Link>
          </Panel>

          <Panel className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
              Transfer and resale
            </p>
            <h2 className="font-display text-2xl">Protected after-purchase flexibility.</h2>
            <p className="text-sm leading-6 text-muted">
              Tickets can move safely between attendees, and resale stays part of the same trusted marketplace instead of disappearing into side flows.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-accent"
            >
              Preview marketplace direction
              <span aria-hidden="true">→</span>
            </Link>
          </Panel>
        </div>
      </section>
    </div>
  );
}
