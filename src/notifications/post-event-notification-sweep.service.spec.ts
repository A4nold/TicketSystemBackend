import { describe, expect, it, vi } from "vitest";

import { PostEventNotificationSweepService } from "./post-event-notification-sweep.service";

describe("PostEventNotificationSweepService", () => {
  it("creates notifications and marks the event as notified for eligible events", async () => {
    const eventUpdate = vi.fn().mockResolvedValue(undefined);
    const createMany = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      event: {
        findMany: vi.fn().mockResolvedValue([{ id: "event_1" }]),
        findUnique: vi.fn().mockResolvedValue({
          endsAt: new Date("2025-05-01T23:00:00.000Z"),
          id: "event_1",
          postEventMessage: "Thanks for coming.",
          postEventNotifiedAt: null,
          postEventPublishedAt: new Date("2025-05-02T10:00:00.000Z"),
          slug: "campus-neon-takeover",
          startsAt: new Date("2025-05-01T21:00:00.000Z"),
          title: "Campus Neon Takeover",
        }),
      },
      ticket: {
        findMany: vi.fn().mockResolvedValue([
          { currentOwnerId: "user_1" },
          { currentOwnerId: "user_2" },
        ]),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          event: {
            update: eventUpdate,
          },
          userNotification: {
            createMany,
          },
        }),
      ),
    };

    const service = new PostEventNotificationSweepService(prisma as never);

    await service.sweepEligibleEvents();

    expect(prisma.event.findMany).toHaveBeenCalled();
    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        eventId: "event_1",
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
      },
      distinct: ["currentOwnerId"],
      select: {
        currentOwnerId: true,
      },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          title: "Post-event update is live",
          userId: "user_1",
        }),
        expect.objectContaining({
          title: "Post-event update is live",
          userId: "user_2",
        }),
      ],
    });
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: "event_1" },
      data: {
        postEventNotifiedAt: expect.any(Date),
      },
    });
  });

  it("does not notify events that are not yet eligible", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          endsAt: new Date("2099-05-01T23:00:00.000Z"),
          id: "event_1",
          postEventMessage: "Thanks for coming.",
          postEventNotifiedAt: null,
          postEventPublishedAt: new Date("2099-05-02T10:00:00.000Z"),
          slug: "campus-neon-takeover",
          startsAt: new Date("2099-05-01T21:00:00.000Z"),
          title: "Campus Neon Takeover",
        }),
      },
      ticket: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const service = new PostEventNotificationSweepService(prisma as never);

    const result = await service.sweepEventById("event_1");

    expect(result).toBe(false);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
