import { NotFoundException } from "@nestjs/common";
import { TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventAttendeesQueryService } from "./event-attendees-query.service";

describe("EventAttendeesQueryService", () => {
  const prisma = {
    event: {
      findUnique: vi.fn(),
    },
    ticket: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  let service: EventAttendeesQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventAttendeesQueryService(prisma as never);
  });

  it("returns event attendee rows with holder and purchaser context", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event_1" });
    prisma.ticket.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    prisma.ticket.findMany.mockResolvedValue([
      {
        currentOwner: {
          email: "holder@example.com",
          id: "holder_1",
          profile: {
            firstName: "Ada",
            lastName: "Holder",
          },
        },
        id: "ticket_1",
        order: {
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
          paidAt: new Date("2026-06-01T10:01:00.000Z"),
          user: {
            email: "buyer@example.com",
            id: "buyer_1",
            profile: {
              firstName: "Grace",
              lastName: "Buyer",
            },
          },
        },
        serialNumber: "CNT-GA-0001",
        status: TicketStatus.USED,
        ticketType: {
          id: "tt_1",
          name: "General Admission",
        },
        usedAt: new Date("2026-06-02T18:00:00.000Z"),
      },
    ]);

    const result = await service.listEventAttendees("event_1", { limit: 20 });

    expect(result.summary).toEqual({
      activeCount: 3,
      checkedInCount: 2,
      refundedCount: 1,
      totalCount: 4,
    });
    expect(result.nextCursor).toBeNull();
    expect(result.items).toEqual([
      expect.objectContaining({
        checkedIn: true,
        holder: expect.objectContaining({
          email: "holder@example.com",
          firstName: "Ada",
        }),
        purchaseDate: new Date("2026-06-01T10:01:00.000Z"),
        purchaser: expect.objectContaining({
          email: "buyer@example.com",
          firstName: "Grace",
        }),
        serialNumber: "CNT-GA-0001",
        ticketStatus: TicketStatus.USED,
      }),
    ]);
  });

  it("throws when the event does not exist", async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(service.listEventAttendees("missing", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
