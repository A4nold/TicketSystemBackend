import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import {
  formatEventWindow,
  getPublicEventBySlug,
} from "@/features/events/public-event";
import { PublicResaleListingCard } from "@/features/resale/public-resale-listing-card";
import { ApiError } from "@/lib/api/client";
import {
  listPublicResaleListings,
  type PublicResaleListing,
} from "@/lib/resale/resale-client";

type MarketplaceEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function loadEventWithListings(slug: string) {
  try {
    const event = await getPublicEventBySlug(slug);
    let listings: PublicResaleListing[] = [];

    try {
      listings = await listPublicResaleListings(slug);
    } catch {
      listings = [];
    }

    return { event, listings };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export async function generateMetadata({
  params,
}: MarketplaceEventPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getPublicEventBySlug(slug);

    return {
      title: `${event.title} | Resale marketplace`,
      description: `Browse resale listings for ${event.title}.`,
    };
  } catch {
    return {
      title: "Marketplace event unavailable",
    };
  }
}

export default async function MarketplaceEventPage({
  params,
}: MarketplaceEventPageProps) {
  const { slug } = await params;
  const { event, listings } = await loadEventWithListings(slug);

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,125,93,0.15),rgba(54,216,202,0.1),rgba(8,17,31,0.84))]">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
            Event resale marketplace
          </p>
          <div className="space-y-3">
            <h1 className="max-w-4xl font-display text-4xl leading-tight sm:text-5xl">
              {event.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Browse active resale listings for this event and enter the secondary-market purchase flow without leaving the product.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/12 bg-black/15 p-4 text-sm text-foreground">
              {formatEventWindow(event)}
            </div>
            <div className="rounded-[1.2rem] border border-white/12 bg-black/15 p-4 text-sm text-foreground">
              {event.venueLabel}
            </div>
            <div className="rounded-[1.2rem] border border-white/12 bg-black/15 p-4 text-sm text-foreground">
              {listings.length} active resale listing{listings.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </Panel>

      {listings.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {listings.map((listing: PublicResaleListing) => (
            <PublicResaleListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <Panel className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            No active resale listings
          </p>
          <h2 className="font-display text-3xl">This event does not have any resale inventory right now.</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            You can still buy on the primary path or return later if new resale inventory appears.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Open event page
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
            >
              Back to marketplace
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
