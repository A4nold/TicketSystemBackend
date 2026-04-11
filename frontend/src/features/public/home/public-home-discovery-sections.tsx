import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import {
  MarketplaceEventCard,
  type MarketplaceEventCardModel,
} from "@/features/public/marketplace/marketplace-event-card";

type PublicHomeDiscoverySectionsProps = Readonly<{
  featuredEvent?: MarketplaceEventCardModel;
  upcomingEvents: MarketplaceEventCardModel[];
}>;

export function PublicHomeDiscoverySections({
  featuredEvent,
  upcomingEvents,
}: PublicHomeDiscoverySectionsProps) {
  return (
    <>
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
          <MarketplaceEventCard event={featuredEvent} featured />
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
                <MarketplaceEventCard key={event.id} event={event} />
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
    </>
  );
}
