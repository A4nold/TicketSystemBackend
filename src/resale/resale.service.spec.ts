import { describe, expect, it, vi } from "vitest";

import { PublicResaleQueryService } from "./public-resale-query.service";
import { ResaleService } from "./resale.service";

describe("ResaleService public listing queries", () => {
  it("returns active public resale listings for a resale-enabled event", async () => {
    const prisma = {
      resaleListing: {
        findMany: vi.fn().mockResolvedValue([
          {
            askingPrice: {
              toString: () => "45.00",
            },
            currency: "EUR",
            event: {
              allowResale: true,
              id: "event_1",
              slug: "campus-neon-takeover",
              startsAt: new Date("2026-05-01T21:00:00.000Z"),
              title: "Campus Neon Takeover",
            },
            expiresAt: new Date("2026-05-01T20:00:00.000Z"),
            id: "listing_1",
            listedAt: new Date("2026-04-30T20:00:00.000Z"),
            status: "LISTED",
            ticket: {
              serialNumber: "CNT-GA-0003",
              ticketType: {
                id: "ticket_type_1",
                name: "General Admission",
              },
            },
          },
        ]),
      },
    };

    const queryService = new PublicResaleQueryService(prisma as never);
    const service = new ResaleService(
      queryService,
      {} as never,
      {} as never,
      {} as never,
    );

    const listings = await service.listPublicListings("campus-neon-takeover");

    expect(prisma.resaleListing.findMany).toHaveBeenCalledWith({
      where: {
        status: "LISTED",
        event: {
          allowResale: true,
          slug: "campus-neon-takeover",
        },
      },
      orderBy: {
        listedAt: "desc",
      },
      include: {
        event: true,
        ticket: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    expect(listings).toEqual([
      expect.objectContaining({
        askingPrice: "45.00",
        event: expect.objectContaining({
          slug: "campus-neon-takeover",
          title: "Campus Neon Takeover",
        }),
        serialNumber: "CNT-GA-0003",
        status: "LISTED",
      }),
    ]);
  });
});
