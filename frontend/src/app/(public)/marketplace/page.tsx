import type { Metadata } from "next";
import {
  formatEventWindow,
  listPublicEvents,
  type PublicEventSummary,
} from "@/features/events/public-event";
import {
  MarketplaceEmptyState,
  MarketplacePageGrid,
  MarketplacePageHero,
} from "@/features/public/marketplace/marketplace-page-sections";
import type { MarketplaceEventCardModel } from "@/features/public/marketplace/marketplace-event-card";

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

function mapMarketplaceEvent(event: PublicEventSummary): MarketplaceEventCardModel {
  return {
    description:
      event.description ??
      "This event supports a controlled resale path alongside the primary ticketing flow.",
    href: `/marketplace/${event.slug}`,
    id: event.id,
    issuedTicketsCount: event.issuedTicketsCount,
    lowestPriceLabel: getLowestPriceLabel(event),
    organizerName: event.organizerName,
    startLabel: formatEventWindow(event),
    statusLabel: event.status.toLowerCase().replaceAll("_", " "),
    title: event.title,
    venueLabel: event.venueLabel,
  };
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
      <MarketplacePageHero />

      {events.length ? (
        <MarketplacePageGrid events={events.map(mapMarketplaceEvent)} />
      ) : (
        <MarketplaceEmptyState />
      )}
    </div>
  );
}
