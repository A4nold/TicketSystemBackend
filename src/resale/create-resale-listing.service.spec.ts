import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { CreateResaleListingService } from "./create-resale-listing.service";

function buildTicket(overrides: Record<string, unknown> = {}) {
  return {
    currentOwnerId: "user_1",
    event: {
      allowResale: true,
      maxResalePrice: null,
      minResalePrice: null,
      resaleEndsAt: null,
      resaleRoyaltyPercent: null,
      resaleStartsAt: null,
      slug: "campus-neon-takeover",
      title: "Campus Neon Takeover",
    },
    eventId: "event_1",
    id: "ticket_1",
    resaleListings: [],
    status: "ISSUED",
    transferRequests: [],
    ...overrides,
  };
}

describe("CreateResaleListingService", () => {
  it("rejects asking prices below the organizer resale floor", async () => {
    const prisma = {
      $transaction: vi.fn(),
    };
    const repository = {
      findTicketForListingCreation: vi.fn().mockResolvedValue(
        buildTicket({
          event: {
            allowResale: true,
            maxResalePrice: null,
            minResalePrice: new Prisma.Decimal("15.00"),
            resaleEndsAt: null,
            resaleRoyaltyPercent: null,
            resaleStartsAt: null,
            slug: "campus-neon-takeover",
            title: "Campus Neon Takeover",
          },
        }),
      ),
    };

    const service = new CreateResaleListingService(
      prisma as never,
      {
        notifyResaleListed: vi.fn(),
      } as never,
      {
        recordResaleListed: vi.fn(),
      } as never,
      repository as never,
    );

    await expect(
      service.createListing(
        "CNT-GA-0001",
        {
          askingPrice: "12.00",
        },
        {
          id: "user_1",
        } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects asking prices above the organizer resale cap", async () => {
    const prisma = {
      $transaction: vi.fn(),
    };
    const repository = {
      findTicketForListingCreation: vi.fn().mockResolvedValue(
        buildTicket({
          event: {
            allowResale: true,
            maxResalePrice: new Prisma.Decimal("25.00"),
            minResalePrice: null,
            resaleEndsAt: null,
            resaleRoyaltyPercent: null,
            resaleStartsAt: null,
            slug: "campus-neon-takeover",
            title: "Campus Neon Takeover",
          },
        }),
      ),
    };

    const service = new CreateResaleListingService(
      prisma as never,
      {
        notifyResaleListed: vi.fn(),
      } as never,
      {
        recordResaleListed: vi.fn(),
      } as never,
      repository as never,
    );

    await expect(
      service.createListing(
        "CNT-GA-0001",
        {
          askingPrice: "30.00",
        },
        {
          id: "user_1",
        } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("persists organizer royalty and seller net amounts on the listing", async () => {
    const listingCreate = vi.fn().mockResolvedValue({
      askingPrice: {
        toString: () => "20.00",
      },
      buyerUserId: null,
      cancelledAt: null,
      currency: "EUR",
      eventId: "event_1",
      expiresAt: null,
      id: "listing_1",
      listedAt: new Date("2026-04-13T14:40:00.000Z"),
      organizerRoyaltyAmount: {
        toFixed: () => "2.00",
      },
      saleReference: "resale_123",
      sellerNetAmount: {
        toFixed: () => "18.00",
      },
      sellerUserId: "user_1",
      soldAt: null,
      status: "LISTED",
      ticketId: "ticket_1",
    });
    const ticketUpdate = vi.fn().mockResolvedValue({
      ownershipRevision: 3,
      status: "RESALE_LISTED",
    });
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          resaleListing: {
            create: listingCreate,
          },
          ticket: {
            update: ticketUpdate,
          },
        }),
      ),
    };
    const repository = {
      findTicketForListingCreation: vi.fn().mockResolvedValue(
        buildTicket({
          event: {
            allowResale: true,
            maxResalePrice: null,
            minResalePrice: null,
            resaleEndsAt: null,
            resaleRoyaltyPercent: new Prisma.Decimal("10.00"),
            resaleStartsAt: null,
            slug: "campus-neon-takeover",
            title: "Campus Neon Takeover",
          },
        }),
      ),
    };

    const service = new CreateResaleListingService(
      prisma as never,
      {
        notifyResaleListed: vi.fn(),
      } as never,
      {
        recordResaleListed: vi.fn(),
      } as never,
      repository as never,
    );

    const result = await service.createListing(
      "CNT-GA-0001",
      {
        askingPrice: "20.00",
      },
      {
        id: "user_1",
      } as never,
    );

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerRoyaltyAmount: expect.anything(),
          sellerNetAmount: expect.anything(),
        }),
      }),
    );
    expect(result.organizerRoyaltyAmount).toBe("2.00");
    expect(result.sellerNetAmount).toBe("18.00");
  });
});
