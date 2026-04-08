import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import {
  formatEventWindow,
  getAvailabilityClasses,
  getPublicEventBySlug,
  getTicketWindowLabel,
  type PublicEventDetail,
} from "@/features/events/public-event";
import { ApiError } from "@/lib/api/client";

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

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getPublicEventBySlug(slug);

    return {
      title: event.title,
      description:
        event.description ??
        `Tickets and event details for ${event.title}.`,
      alternates: {
        canonical: `/events/${event.slug}`,
      },
      openGraph: {
        title: event.title,
        description:
          event.description ??
          `View ticket options and public event details for ${event.title}.`,
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

function EventSummary({ event }: { event: PublicEventDetail }) {
  const authNext = `/tickets?eventSlug=${encodeURIComponent(event.slug)}`;

  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,1fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Public event page
            </p>
            <h1 className="max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
              {event.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {event.description ?? "Private event details and ticket access."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Date & time
              </p>
              <p className="mt-2 text-base leading-7 text-foreground">
                {formatEventWindow(event)}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Location
              </p>
              <p className="mt-2 text-base leading-7 text-foreground">
                {event.venueLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-[1.75rem] border border-accent/25 bg-linear-to-br from-accent/14 to-accent-warm/12 p-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
              Event access
            </p>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Ticket options are live below.
              </p>
              <p className="text-sm leading-6 text-muted">
                Review ticket types, pricing, and sales windows before you move
                into checkout in the next step of the attendee journey.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/auth?mode=register&eventSlug=${encodeURIComponent(event.slug)}&next=${encodeURIComponent(authNext)}`}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
              >
                Create account to continue
              </Link>
              <Link
                href={`/auth?mode=login&eventSlug=${encodeURIComponent(event.slug)}&next=${encodeURIComponent(authNext)}`}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Sign in
              </Link>
            </div>
            <a
              href="#ticket-options"
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-black/20"
            >
              Review ticket options first
            </a>
            <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
              <p className="rounded-2xl border border-border bg-black/10 px-4 py-3">
                {event.allowResale
                  ? "Organizer-controlled resale is enabled."
                  : "Resale is disabled for this event."}
              </p>
              <p className="rounded-2xl border border-border bg-black/10 px-4 py-3">
                Hosted by {event.organizerName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Panel>
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
    <article className="rounded-[1.5rem] border border-border bg-black/10 p-5">
      <div className="flex flex-col gap-5">
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
              ? "Ready for the checkout step when purchase flow is enabled."
              : ticketType.restrictionCopy}
          </p>
        </div>
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
            Ticket types stay visible without requiring sign-in, and any
            restricted or inactive options are called out explicitly before the
            attendee reaches checkout.
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

        <Link
          href="/"
          className="inline-flex rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-surface-soft"
        >
          Back to public home
        </Link>
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
          The slug is valid, but ticket discovery is currently unavailable for
          this event. Public access resumes when the organizer republishes it.
        </p>
      </div>
    </Panel>
  );
}

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  const isPubliclyAvailable = event.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <EventSummary event={event} />
      {isPubliclyAvailable ? (
        <TicketOptions event={event} />
      ) : (
        <EventUnavailableState />
      )}
      <EventFooter slug={event.slug} />
    </div>
  );
}
