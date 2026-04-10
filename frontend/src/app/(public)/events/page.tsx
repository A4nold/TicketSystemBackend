import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import {
  formatEventWindow,
  listPublicEvents,
  type PublicEventSummary,
} from "@/features/events/public-event";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse upcoming events, compare access tiers, and discover what is happening next.",
};

function getStartingPriceLabel(event: PublicEventSummary) {
  const activeTicketTypes = event.ticketTypes
    .filter((ticketType) => ticketType.isPurchasable)
    .sort((left, right) => left.priceValue - right.priceValue);

  if (!activeTicketTypes.length) {
    return "Tickets unavailable";
  }

  return `From ${activeTicketTypes[0].priceLabel}`;
}

function EventDiscoveryCard({ event }: { event: PublicEventSummary }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group rounded-[1.6rem] border border-border bg-white/5 p-5 transition hover:border-accent/45 hover:bg-white/8"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
            {event.status.toLowerCase().replaceAll("_", " ")}
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${
              event.allowResale
                ? "border-accent/35 bg-accent/10 text-accent"
                : "border-border bg-black/10 text-muted"
            }`}
          >
            {event.allowResale ? "Resale enabled" : "Primary sale only"}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl leading-tight text-foreground">
            {event.title}
          </h2>
          <p className="text-sm leading-6 text-muted">
            {event.description ?? "Browse tickets and event access details."}
          </p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-muted">When</dt>
            <dd className="mt-2 text-foreground">
              {formatEventWindow(event)}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-muted">Where</dt>
            <dd className="mt-2 text-foreground">{event.venueLabel}</dd>
          </div>
        </dl>

        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted">Starting price</p>
            <p className="font-display text-3xl text-foreground">
              {getStartingPriceLabel(event)}
            </p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>{event.issuedTicketsCount} tickets issued</p>
            <p>{event.organizerName}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {event.ticketTypes.length} ticket type{event.ticketTypes.length === 1 ? "" : "s"}
          </span>
          <span className="font-medium text-foreground transition group-hover:translate-x-1">
            View event →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function EventsDiscoveryPage() {
  let events: PublicEventSummary[] = [];

  try {
    events = await listPublicEvents();
  } catch {
    events = [];
  }

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(54,216,202,0.12),rgba(255,125,93,0.12),rgba(8,17,31,0.82))]">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Event discovery
          </p>
          <div className="space-y-3">
            <h1 className="max-w-4xl font-display text-4xl leading-tight sm:text-5xl">
              Browse upcoming events and choose where your next ticket goes.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Compare event timing, venue context, and ticket entry points from one marketplace-style listing surface.
            </p>
          </div>
        </div>
      </Panel>

      {events.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <EventDiscoveryCard key={event.id} event={event} />
          ))}
        </section>
      ) : (
        <Panel className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            No discoverable events yet
          </p>
          <h2 className="font-display text-3xl">The marketplace is waiting for the next event drop.</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Once organizers publish events, they will appear here for attendees to browse and purchase.
          </p>
        </Panel>
      )}
    </div>
  );
}
