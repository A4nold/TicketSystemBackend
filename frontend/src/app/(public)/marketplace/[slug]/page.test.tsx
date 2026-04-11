import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MarketplaceEventPage from "./page";

vi.mock("@/features/events/public-event", () => ({
  formatEventWindow: () => "1 May 2026, 21:00",
  getPublicEventBySlug: vi.fn(),
}));

vi.mock("@/features/resale/public-resale-listing-card", () => ({
  PublicResaleListingCard: ({
    listing,
  }: {
    listing: { serialNumber: string; ticketType: { name: string } };
  }) => <div>{`${listing.ticketType.name} ${listing.serialNumber}`}</div>,
}));

vi.mock("@/lib/resale/resale-client", () => ({
  listPublicResaleListings: vi.fn(),
}));

describe("MarketplaceEventPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders returned resale listings for an event", async () => {
    const { getPublicEventBySlug } = await import("@/features/events/public-event");
    const { listPublicResaleListings } = await import("@/lib/resale/resale-client");

    vi.mocked(getPublicEventBySlug).mockResolvedValue({
      allowResale: true,
      description: "Event description",
      endsAt: null,
      id: "event_1",
      organizerName: "Campus Night",
      slug: "campus-neon-takeover",
      startsAt: "2026-05-01T21:00:00.000Z",
      status: "PUBLISHED",
      ticketTypes: [],
      timezone: "Europe/Dublin",
      title: "Campus Neon Takeover",
      venueLabel: "Main Hall",
    });
    vi.mocked(listPublicResaleListings).mockResolvedValue([
      {
        askingPrice: "45.00",
        currency: "EUR",
        event: {
          id: "event_1",
          slug: "campus-neon-takeover",
          startsAt: "2026-05-01T21:00:00.000Z",
          title: "Campus Neon Takeover",
        },
        expiresAt: "2026-05-01T20:00:00.000Z",
        id: "listing_1",
        listedAt: "2026-04-30T20:00:00.000Z",
        serialNumber: "CNT-GA-0003",
        status: "LISTED",
        ticketType: {
          id: "ticket_type_1",
          name: "General Admission",
        },
      },
    ]);

    render(
      await MarketplaceEventPage({
        params: Promise.resolve({ slug: "campus-neon-takeover" }),
      }),
    );

    expect(
      screen.getByText(/event resale marketplace/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/general admission cnt-ga-0003/i)).toBeInTheDocument();
  });

  it("renders the empty state when no resale listings exist", async () => {
    const { getPublicEventBySlug } = await import("@/features/events/public-event");
    const { listPublicResaleListings } = await import("@/lib/resale/resale-client");

    vi.mocked(getPublicEventBySlug).mockResolvedValue({
      allowResale: true,
      description: "Event description",
      endsAt: null,
      id: "event_1",
      organizerName: "Campus Night",
      slug: "campus-neon-takeover",
      startsAt: "2026-05-01T21:00:00.000Z",
      status: "PUBLISHED",
      ticketTypes: [],
      timezone: "Europe/Dublin",
      title: "Campus Neon Takeover",
      venueLabel: "Main Hall",
    });
    vi.mocked(listPublicResaleListings).mockResolvedValue([]);

    render(
      await MarketplaceEventPage({
        params: Promise.resolve({ slug: "campus-neon-takeover" }),
      }),
    );

    expect(screen.getByText(/no active resale listings/i)).toBeInTheDocument();
    expect(
      screen.getByText(/does not have any resale inventory right now/i),
    ).toBeInTheDocument();
  });
});
