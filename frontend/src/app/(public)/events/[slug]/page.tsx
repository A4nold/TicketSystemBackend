import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { CheckoutStartCta } from "@/features/checkout/checkout-start-cta";
import {
  formatEventWindow,
  getAvailabilityClasses,
  getPublicEventBySlug,
  getTicketWindowLabel,
  type PublicEventDetail,
} from "@/features/events/public-event";
import { PublicResaleListingCard } from "@/features/resale/public-resale-listing-card";
import { ApiError } from "@/lib/api/client";
import {
  listPublicResaleListings,
  type PublicResaleListing,
} from "@/lib/resale/resale-client";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function loadEvent(slug: string) {
  try {
    return await getPublicEventBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

async function loadResaleListings(slug: string) {
  try {
    return await listPublicResaleListings(slug);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getPublicEventBySlug(slug);

    return {
      title: `${event.title} | Events`,
      description:
        event.description ??
        `View ticket options, event timing, and access details for ${event.title}.`,
      alternates: {
        canonical: `/events/${event.slug}`,
      },
      openGraph: {
        title: event.title,
        description:
          event.description ??
          `Browse event details and ticket options for ${event.title}.`,
        type: "website",
        url: `/events/${event.slug}`,
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        title: "Event unavailable",
        description: "This event page is no longer publicly available.",
      };
    }

    throw error;
  }
}

function getStartingPriceLabel(event: PublicEventDetail) {
  const activeTicketTypes = event.ticketTypes
    .filter((ticketType) => ticketType.isPurchasable)
    .sort((left, right) => left.priceValue - right.priceValue);

  if (!activeTicketTypes.length) {
    return "Tickets unavailable";
  }

  return `From ${activeTicketTypes[0].priceLabel}`;
}

function EventHero({ event }: { event: PublicEventDetail }) {
  const authNext = `/tickets?eventSlug=${encodeURIComponent(event.slug)}`;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(54,216,202,0.12),rgba(255,125,93,0.12),rgba(8,17,31,0.84))] px-6 py-8 shadow-[0_24px_90px_rgba(2,8,20,0.28)] sm:px-8 sm:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(54,216,202,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,125,93,0.18),transparent_32%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.82fr)]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-accent">
              Event access
            </span>
            <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
              {event.status.toLowerCase().replaceAll("_", " ")}
            </span>
            <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
              Hosted by {event.organizerName}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="max-w-4xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              {event.description ?? "Event details and ticket access are available below."}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.3rem] border border-white/12 bg-black/15 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">When</dt>
              <dd className="mt-2 text-sm leading-6 text-foreground">
                {formatEventWindow(event)}
              </dd>
            </div>
            <div className="rounded-[1.3rem] border border-white/12 bg-black/15 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Where</dt>
              <dd className="mt-2 text-sm leading-6 text-foreground">
                {event.venueLabel}
              </dd>
            </div>
            <div className="rounded-[1.3rem] border border-white/12 bg-black/15 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted">Entry</dt>
              <dd className="mt-2 text-sm leading-6 text-foreground">
                {getStartingPriceLabel(event)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-[1.75rem] border border-white/12 bg-black/18 p-6 backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
              Purchase path
            </p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Buy now and keep every ticket in your wallet.
              </p>
              <p className="text-sm leading-6 text-muted">
                Choose a ticket tier below, continue into checkout, and keep access ready for wallet delivery, QR presentation, transfer, and resale where enabled.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="#ticket-options"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Review ticket options
            </a>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/auth?mode=register&eventSlug=${encodeURIComponent(event.slug)}&next=${encodeURIComponent(authNext)}`}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Create account
              </Link>
              <Link
                href={`/auth?mode=login&eventSlug=${encodeURIComponent(event.slug)}&next=${encodeURIComponent(authNext)}`}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-black/20"
              >
                Sign in
              </Link>
            </div>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
              <p className="rounded-2xl border border-border bg-black/10 px-4 py-3">
                {event.allowResale
                  ? "Controlled resale is active for this event."
                  : "This event is primary-sale only."}
              </p>
              <p className="rounded-2xl border border-border bg-black/10 px-4 py-3">
                Tickets stay tied to identity and wallet truth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TicketCard({
  event,
  ticketType,
}: {
  event: PublicEventDetail;
  ticketType: PublicEventDetail["ticketTypes"][number];
}) {
  const availabilityClasses = getAvailabilityClasses(ticketType.availabilityTone);

  return (
    <article className="rounded-[1.55rem] border border-border bg-black/10 p-5">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">
              {ticketType.name}
            </p>
            <p className="text-sm leading-6 text-muted">
              {ticketType.description ?? "Ticket access for this event."}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${availabilityClasses}`}
          >
            {ticketType.availabilityLabel}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl text-foreground">
              {ticketType.priceLabel}
            </p>
            <p className="text-sm text-muted">{ticketType.quantityLabel}</p>
          </div>

          <div className="text-right text-sm leading-6 text-muted">
            {ticketType.maxPerOrder ? (
              <p>Limit {ticketType.maxPerOrder} per order</p>
            ) : null}
            <p>{getTicketWindowLabel(ticketType, event.timezone)}</p>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-border bg-surface px-4 py-3">
          <p className="text-sm leading-6 text-muted">
            {ticketType.isPurchasable
              ? "Choose your quantity and continue into the attendee checkout step."
              : ticketType.restrictionCopy}
          </p>
        </div>

        <CheckoutStartCta
          eventSlug={event.slug}
          ticketType={{
            availabilityLabel: ticketType.availabilityLabel,
            id: ticketType.id,
            isPurchasable: ticketType.isPurchasable,
            maxPerOrder: ticketType.maxPerOrder,
            name: ticketType.name,
            priceLabel: ticketType.priceLabel,
            priceValue: ticketType.priceValue,
            quantity: ticketType.quantity,
            restrictionCopy: ticketType.restrictionCopy,
          }}
        />
      </div>
    </article>
  );
}

function TicketOptions({ event }: { event: PublicEventDetail }) {
  return (
    <Panel id="ticket-options">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Ticket options
          </p>
          <h2 className="font-display text-3xl">Choose the right access tier</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
            Compare ticket tiers, pricing, and sales windows before you continue into checkout.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {event.ticketTypes.map((ticketType) => (
            <TicketCard
              key={ticketType.id}
              event={event}
              ticketType={ticketType}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TrustStrip({ event }: { event: PublicEventDetail }) {
  return (
    <Panel>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-[1.35rem] border border-border bg-black/10 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Wallet delivery
          </p>
          <p className="text-sm leading-6 text-muted">
            Paid tickets continue into the attendee wallet for QR access, transfer, and live state tracking.
          </p>
        </div>
        <div className="space-y-2 rounded-[1.35rem] border border-border bg-black/10 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Ownership truth
          </p>
          <p className="text-sm leading-6 text-muted">
            Every ticket action is backed by backend ownership state instead of a loose confirmation-only flow.
          </p>
        </div>
        <div className="space-y-2 rounded-[1.35rem] border border-border bg-black/10 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Marketplace layer
          </p>
          <p className="text-sm leading-6 text-muted">
            {event.allowResale
              ? "This event supports controlled resale, so post-purchase activity can stay inside the same product."
              : "This event keeps access on the primary sale path only."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function ResaleListings({
  event,
  listings,
}: {
  event: PublicEventDetail;
  listings: PublicResaleListing[];
}) {
  if (!event.allowResale) {
    return null;
  }

  return (
    <Panel>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Resale marketplace
            </p>
            <h2 className="font-display text-3xl">Active resale inventory for this event</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
              Buyers can browse available resale tickets here before continuing into a controlled purchase path.
            </p>
          </div>
          <Link
            href={`/marketplace/${event.slug}`}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
          >
            Open resale marketplace
          </Link>
        </div>

        {listings.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {listings.slice(0, 2).map((listing) => (
              <PublicResaleListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
            There are no active resale listings for this event right now.
          </div>
        )}
      </div>
    </Panel>
  );
}

function EventFooter({ slug }: { slug: string }) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted">
            Shareable event path
          </p>
          <p className="font-mono text-sm text-foreground">/events/{slug}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/events"
            className="inline-flex rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/45 hover:bg-black/20"
          >
            Browse all events
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-surface-soft"
          >
            View marketplace
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function EventUnavailableState() {
  return (
    <Panel className="border-warning/30 bg-warning/8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-warning">
          Event unavailable
        </p>
        <h2 className="font-display text-2xl">This event is not public right now.</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
          The slug is valid, but ticket discovery is currently unavailable for this event. Public access resumes when the organizer republishes it.
        </p>
      </div>
    </Panel>
  );
}

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const [event, resaleListings] = await Promise.all([
    loadEvent(slug),
    loadResaleListings(slug),
  ]);
  const isPubliclyAvailable = event.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <EventHero event={event} />
      {isPubliclyAvailable ? <TicketOptions event={event} /> : <EventUnavailableState />}
      {isPubliclyAvailable ? (
        <ResaleListings event={event} listings={resaleListings} />
      ) : null}
      <TrustStrip event={event} />
      <EventFooter slug={event.slug} />
    </div>
  );
}
