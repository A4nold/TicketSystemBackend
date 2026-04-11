import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import {
  getPublicEventBySlug,
  type PublicEventDetail,
} from "@/features/events/public-event";
import {
  PublicEventFooter,
  PublicEventHero,
  PublicEventResaleSection,
  PublicEventTicketOptions,
  PublicEventUnavailableState,
} from "@/features/public/events/public-event-page-sections";
import { ApiError } from "@/lib/api/client";
import {
  listPublicResaleListings,
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

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const [event, resaleListings] = await Promise.all([
    loadEvent(slug),
    loadResaleListings(slug),
  ]);
  const isPubliclyAvailable = event.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <PublicEventHero event={event} />
      {isPubliclyAvailable ? (
        <PublicEventTicketOptions event={event} />
      ) : (
        <PublicEventUnavailableState />
      )}
      {isPubliclyAvailable ? (
        <PublicEventResaleSection event={event} listings={resaleListings} />
      ) : null}
      <TrustStrip event={event} />
      <PublicEventFooter slug={event.slug} />
    </div>
  );
}
