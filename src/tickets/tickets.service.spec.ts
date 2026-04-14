import { describe, expect, it, vi } from "vitest";

import { TicketQueryService } from "./ticket-query.service";

describe("TicketQueryService response mapping", () => {
  it("maps ticket summary responses with owner and scan summary shape", async () => {
    const prisma = {
      ticket: {
        findMany: vi.fn().mockResolvedValue([
          {
            currentOwner: {
              email: "ada@student.ie",
              id: "user_1",
              profile: {
                firstName: "Ada",
                lastName: "Student",
              },
            },
            event: {
              endsAt: null,
              id: "event_1",
              maxResalePrice: null,
              minResalePrice: null,
              postEventCtaLabel: null,
              postEventCtaUrl: null,
              postEventMessage: null,
              postEventPublishedAt: null,
              resaleEndsAt: null,
              resaleRoyaltyPercent: null,
              resaleStartsAt: null,
              slug: "campus-neon-takeover",
              startsAt: new Date("2026-05-01T21:00:00.000Z"),
              status: "PUBLISHED",
              title: "Campus Neon Takeover",
            },
            id: "ticket_1",
            issuedAt: new Date("2026-04-20T21:00:00.000Z"),
            ownershipRevision: 2,
            qrTokenId: "qr_seed_ga_0001",
            scanAttempts: [
              {
                outcome: "VALID",
                scannedAt: new Date("2026-05-01T20:55:00.000Z"),
              },
            ],
            serialNumber: "CNT-GA-0001",
            status: "ISSUED",
            ticketType: {
              currency: "EUR",
              id: "ticket_type_1",
              name: "General Admission",
              price: {
                toFixed: () => "25.00",
              },
            },
            usedAt: null,
          },
        ]),
      },
    };

    const service = new TicketQueryService(prisma as never);

    const result = await service.listTickets({
      sort: "asc",
    });

    expect(result).toEqual([
      expect.objectContaining({
        currentOwner: {
          email: "ada@student.ie",
          firstName: "Ada",
          id: "user_1",
          lastName: "Student",
        },
        event: expect.objectContaining({
          slug: "campus-neon-takeover",
          title: "Campus Neon Takeover",
        }),
        scanSummary: {
          lastScannedAt: new Date("2026-05-01T20:55:00.000Z"),
          latestOutcome: "VALID",
          totalAttempts: 1,
        },
        ticketType: {
          currency: "EUR",
          id: "ticket_type_1",
          name: "General Admission",
          price: "25.00",
        },
      }),
    ]);
  });

  it("maps ticket detail responses with transfer, resale, ownership, and scan history", async () => {
    const prisma = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          cancelledAt: null,
          currentOwner: {
            email: "ada@student.ie",
            id: "user_1",
            profile: {
              firstName: "Ada",
              lastName: "Student",
            },
          },
          event: {
            endsAt: new Date("2026-05-01T23:00:00.000Z"),
            id: "event_1",
            maxResalePrice: {
              toFixed: () => "40.00",
            },
            minResalePrice: {
              toFixed: () => "15.00",
            },
            postEventCtaLabel: null,
            postEventCtaUrl: null,
            postEventMessage: null,
            postEventPublishedAt: null,
            resaleEndsAt: new Date("2026-05-01T20:30:00.000Z"),
            resaleRoyaltyPercent: {
              toFixed: () => "10.00",
            },
            resaleStartsAt: new Date("2026-04-20T20:00:00.000Z"),
            slug: "campus-neon-takeover",
            startsAt: new Date("2026-05-01T21:00:00.000Z"),
            status: "PUBLISHED",
            title: "Campus Neon Takeover",
          },
          id: "ticket_1",
          issuedAt: new Date("2026-04-20T21:00:00.000Z"),
          ownershipHistory: [
            {
              changeType: "TRANSFER_ACCEPTED",
              createdAt: new Date("2026-04-25T20:00:00.000Z"),
              fromUser: {
                email: "ada@student.ie",
              },
              revision: 2,
              toUser: {
                email: "tobi@student.ie",
              },
            },
          ],
          ownershipRevision: 2,
          qrTokenId: "qr_seed_ga_0001",
          refundedAt: null,
          reservedUntil: null,
          resaleListings: [
            {
              askingPrice: {
                toFixed: () => "30.00",
              },
              cancelledAt: null,
              createdAt: new Date("2026-04-26T20:00:00.000Z"),
              currency: "EUR",
              id: "listing_1",
              listedAt: new Date("2026-04-26T21:00:00.000Z"),
              organizerRoyaltyAmount: {
                toFixed: () => "3.00",
              },
              sellerNetAmount: {
                toFixed: () => "27.00",
              },
              soldAt: null,
              status: "LISTED",
            },
          ],
          scanAttempts: [
            {
              outcome: "VALID",
              reasonCode: "first_entry",
              scanSession: {
                deviceLabel: "Front Gate iPhone",
                mode: "ONLINE",
              },
              scannedAt: new Date("2026-05-01T20:55:00.000Z"),
              scannedByUser: {
                email: "scanner@campusnight.ie",
              },
            },
          ],
          serialNumber: "CNT-GA-0001",
          status: "TRANSFER_PENDING",
          ticketType: {
            currency: "EUR",
            id: "ticket_type_1",
            name: "General Admission",
            price: {
              toFixed: () => "25.00",
            },
          },
          transferRequests: [
            {
              acceptedAt: null,
              cancelledAt: null,
              createdAt: new Date("2026-04-25T19:00:00.000Z"),
              expiresAt: new Date("2026-04-26T19:00:00.000Z"),
              id: "transfer_1",
              recipientEmail: "tobi@student.ie",
              reminderSentAt: null,
              senderUserId: "user_1",
              status: "PENDING",
            },
          ],
          usedAt: null,
        }),
      },
    };

    const service = new TicketQueryService(prisma as never);

    const result = await service.getTicketBySerialNumber("CNT-GA-0001");

    expect(result.latestTransfer).toEqual({
      acceptedAt: null,
      cancelledAt: null,
      expiresAt: new Date("2026-04-26T19:00:00.000Z"),
      id: "transfer_1",
      recipientEmail: "tobi@student.ie",
      reminderSentAt: null,
      senderUserId: "user_1",
      status: "PENDING",
    });
    expect(result.latestResaleListing).toEqual({
      askingPrice: "30.00",
      currency: "EUR",
      id: "listing_1",
      listedAt: new Date("2026-04-26T21:00:00.000Z"),
      organizerRoyaltyAmount: "3.00",
      sellerNetAmount: "27.00",
      soldAt: null,
      status: "LISTED",
    });
    expect(result.ownershipHistory).toEqual([
      {
        changeType: "TRANSFER_ACCEPTED",
        createdAt: new Date("2026-04-25T20:00:00.000Z"),
        fromEmail: "ada@student.ie",
        revision: 2,
        toEmail: "tobi@student.ie",
      },
    ]);
    expect(result.scanAttempts).toEqual([
      {
        deviceLabel: "Front Gate iPhone",
        mode: "ONLINE",
        outcome: "VALID",
        reasonCode: "first_entry",
        scannedAt: new Date("2026-05-01T20:55:00.000Z"),
        scannedByEmail: "scanner@campusnight.ie",
      },
    ]);
  });

  it("includes eligible post-event content in ticket responses only after publish and event completion", async () => {
    const prisma = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          cancelledAt: null,
          currentOwner: {
            email: "ada@student.ie",
            id: "user_1",
            profile: {
              firstName: "Ada",
              lastName: "Student",
            },
          },
          event: {
            endsAt: new Date("2025-05-01T23:00:00.000Z"),
            id: "event_1",
            maxResalePrice: null,
            minResalePrice: null,
            postEventCtaLabel: "View replay",
            postEventCtaUrl: "https://example.com/replay",
            postEventMessage: "Thanks for coming back to the wallet.",
            postEventPublishedAt: new Date("2025-05-02T10:00:00.000Z"),
            resaleEndsAt: null,
            resaleRoyaltyPercent: null,
            resaleStartsAt: null,
            slug: "campus-neon-takeover",
            startsAt: new Date("2025-05-01T21:00:00.000Z"),
            status: "COMPLETED",
            title: "Campus Neon Takeover",
          },
          id: "ticket_1",
          issuedAt: new Date("2025-04-20T21:00:00.000Z"),
          ownershipHistory: [],
          ownershipRevision: 2,
          qrTokenId: "qr_seed_ga_0001",
          refundedAt: null,
          reservedUntil: null,
          resaleListings: [],
          scanAttempts: [],
          serialNumber: "CNT-GA-0001",
          status: "USED",
          ticketType: {
            currency: "EUR",
            id: "ticket_type_1",
            name: "General Admission",
            price: {
              toFixed: () => "25.00",
            },
          },
          transferRequests: [],
          usedAt: new Date("2025-05-01T21:30:00.000Z"),
        }),
      },
    };

    const service = new TicketQueryService(prisma as never);

    const result = await service.getTicketBySerialNumber("CNT-GA-0001");

    expect(result.event.postEventContent).toEqual({
      ctaLabel: "View replay",
      ctaUrl: "https://example.com/replay",
      message: "Thanks for coming back to the wallet.",
      publishedAt: new Date("2025-05-02T10:00:00.000Z"),
    });
  });
});
