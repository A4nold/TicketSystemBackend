import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import {
  formatEventWindow,
  listPublicEvents,
  type PublicEventSummary,
} from "@/features/events/public-event";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Explore resale-ready events and discover where controlled secondary ticket activity is available.",
};

function getLowestPriceLabel(event: PublicEventSummary) {
  const ticketTypes = event.ticketTypes
    .filter((ticketType) => ticketType.isPurchasable)
    .sort((left, right) => left.priceValue - right.priceValue);

  if (!ticketTypes.length) {
    return "Tickets unavailable";
  }

  return `From ${ticketTypes[0].priceLabel}`;
}

function MarketplaceEventCard({ event }: { event: PublicEventSummary }) {
  return (
    <Link
      href={`/marketplace/${event.slug}`}
      className="group rounded-[1.6rem] border border-border bg-white/5 p-5 transition hover:border-accent/45 hover:bg-white/8"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-accent">
            Resale-ready event
          </span>
          <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
            {event.status.toLowerCase().replaceAll("_", " ")}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl leading-tight text-foreground">
            {event.title}
          </h2>
          <p className="text-sm leading-6 text-muted">
            {event.description ??
              "This event supports a controlled resale path alongside the primary ticketing flow."}
          </p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-muted">When</dt>
            <dd className="mt-2 text-foreground">{formatEventWindow(event)}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-muted">Where</dt>
            <dd className="mt-2 text-foreground">{event.venueLabel}</dd>
          </div>
        </dl>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Ticket entry</p>
            <p className="font-display text-3xl text-foreground">
              {getLowestPriceLabel(event)}
            </p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>{event.organizerName}</p>
            <p>{event.issuedTicketsCount} issued</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Controlled resale stays tied to event and ownership rules
          </span>
          <span className="font-medium text-foreground transition group-hover:translate-x-1">
            Browse resale →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function MarketplacePage() {
  let events: PublicEventSummary[] = [];

  try {
    events = (await listPublicEvents()).filter((event) => event.allowResale);
  } catch {
    events = [];
  }

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,125,93,0.15),rgba(54,216,202,0.1),rgba(8,17,31,0.84))]">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
            Marketplace entry
          </p>
          <div className="space-y-3">
            <h1 className="max-w-4xl font-display text-4xl leading-tight sm:text-5xl">
              Explore events where resale can live inside the same trusted ticket flow.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Browse event-scoped resale inventory where organizers have enabled controlled secondary-market activity.
            </p>
          </div>
        </div>
      </Panel>

      {events.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <MarketplaceEventCard key={event.id} event={event} />
          ))}
        </section>
      ) : (
        <Panel className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            No resale-ready events yet
          </p>
          <h2 className="font-display text-3xl">Marketplace activity will appear here as organizers enable resale.</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            For now, browse the main event discovery surface and return here as more events opt into the controlled resale path.
          </p>
          <div>
            <Link
              href="/events"
              className="inline-flex rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Browse all events
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
