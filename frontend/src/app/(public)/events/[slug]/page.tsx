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
  searchParams?: Promise<{
    inviterName?: string;
    offerPrice?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>;
};

function buildAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const baseUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3001";
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${normalizedBase}${normalizedPath}`;
}

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
  searchParams,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const inviterName = resolvedSearchParams?.inviterName?.trim() || null;

  try {
    const event = await getPublicEventBySlug(slug);
    const canonicalPath = `/events/${event.slug}`;
    const canonicalUrl = buildAbsoluteUrl(canonicalPath);
    const previewTitle = inviterName
      ? `${inviterName} invited you to ${event.title}`
      : (event.shareHeadline ?? event.title);
    const previewDescription = inviterName
      ? "Get your ticket on Maya"
      : (event.shareDescription ??
        event.description ??
        `View ticket options, event timing, and access details for ${event.title}.`);
    const previewImageUrl =
      event.shareImageUrl ?? event.coverImageUrl ?? "/next.svg";
    const absolutePreviewImageUrl = buildAbsoluteUrl(previewImageUrl);

    return {
      title: `${previewTitle} | Maya`,
      description: previewDescription,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: previewTitle,
        description: previewDescription,
        images: [
          {
            alt: `${event.title} event card`,
            url: absolutePreviewImageUrl,
          },
        ],
        type: "website",
        url: canonicalUrl,
      },
      twitter: {
        card: "summary_large_image",
        title: previewTitle,
        description: previewDescription,
        images: [absolutePreviewImageUrl],
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

export default async function PublicEventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const initialTicketTypeId = resolvedSearch?.ticketTypeId;
  const parsedQuantity = Number(resolvedSearch?.quantity ?? "");
  const parsedOfferPrice = Number(resolvedSearch?.offerPrice ?? "");
  const initialQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity >= 1 ? parsedQuantity : undefined;
  const initialOfferPrice =
    Number.isFinite(parsedOfferPrice) && parsedOfferPrice > 0
      ? parsedOfferPrice
      : undefined;
  const [event, resaleListings] = await Promise.all([
    loadEvent(slug),
    loadResaleListings(slug),
  ]);
  const isPubliclyAvailable = event.status === "PUBLISHED";

  return (
    <div className="space-y-6">
      <PublicEventHero event={event} />
      {isPubliclyAvailable ? (
        <PublicEventTicketOptions
          event={event}
          initialOfferPrice={initialOfferPrice}
          initialQuantity={initialQuantity}
          initialTicketTypeId={initialTicketTypeId}
        />
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
