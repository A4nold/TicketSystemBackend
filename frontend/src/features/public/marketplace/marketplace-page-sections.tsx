import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import {
  MarketplaceEventCard,
  type MarketplaceEventCardModel,
} from "@/features/public/marketplace/marketplace-event-card";

export function MarketplacePageHero() {
  return (
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
  );
}

export function MarketplacePageGrid({
  events,
}: {
  events: MarketplaceEventCardModel[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {events.map((event) => (
        <MarketplaceEventCard
          key={event.id}
          event={event}
          hrefLabel="Browse resale"
          secondaryLabel="Controlled resale stays tied to event and ownership rules"
        />
      ))}
    </section>
  );
}

export function MarketplaceEmptyState() {
  return (
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
  );
}
