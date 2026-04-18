import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEventBySlug, listPublicEvents } from "@/lib/events/public-events-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public-events-client", () => {
  it("maps public event summaries for discovery", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => [
        {
          allowResale: true,
          coverImageUrl: null,
          description: "Late-night campus energy.",
          endsAt: "2026-05-01T22:00:00.000Z",
          id: "event-1",
          issuedTicketsCount: 34,
          organizer: {
            email: "organizer@example.com",
            firstName: "Ada",
            id: "user-1",
            lastName: "Lovelace",
          },
          slug: "campus-neon",
          startsAt: "2026-05-01T19:00:00.000Z",
          status: "PUBLISHED",
          ticketTypes: [
            {
              currency: "EUR",
              description: null,
              id: "type-1",
              isActive: true,
              maxPerOrder: 4,
              name: "General Admission",
              price: "15.00",
              quantity: 100,
            },
          ],
          timezone: "Europe/Dublin",
          title: "Campus Neon",
          venueAddress: "Dublin",
          venueName: "Student Union",
        },
      ],
      ok: true,
    } as Response);

    const events = await listPublicEvents();

    expect(events[0]?.organizerName).toBe("Ada Lovelace");
    expect(events[0]?.ticketTypes[0]?.priceLabel).toContain("15.00");
    expect(events[0]?.ticketTypes[0]?.availabilityLabel).toBe("Available");
  });

  it("marks inactive ticket types as unavailable on event detail", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({
        allowResale: false,
        coverImageUrl: null,
        description: "Live showcase.",
        endsAt: null,
        id: "event-2",
        organizer: {
          email: "organizer@example.com",
          firstName: null,
          id: "user-2",
          lastName: null,
        },
        slug: "city-session",
        startsAt: "2026-06-01T19:00:00.000Z",
        status: "PUBLISHED",
        ticketTypes: [
          {
            currency: "EUR",
            description: null,
            id: "type-2",
            isActive: false,
            maxPerOrder: null,
            name: "VIP",
            price: "45.00",
            quantity: 20,
          },
        ],
        timezone: "Europe/Dublin",
        title: "City Session",
        venueAddress: null,
        venueName: null,
      }),
      ok: true,
    } as Response);

    const event = await getPublicEventBySlug("city-session");

    expect(event.ticketTypes[0]?.availabilityTone).toBe("unavailable");
    expect(event.venueLabel).toBe("Venue details to be confirmed");
  });
});
