import { describe, expect, it, vi } from "vitest";

import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  it("lists recent notifications for the authenticated user", async () => {
    const prisma = {
      userNotification: {
        findMany: vi.fn().mockResolvedValue([
          {
            actionUrl: "/wallet/CNT-GA-0001",
            body: "Your transfer is pending acceptance.",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            id: "notification_1",
            metadata: { serialNumber: "CNT-GA-0001" },
            readAt: null,
            status: "UNREAD",
            title: "Transfer started",
            type: "TRANSFER_CREATED",
          },
        ]),
      },
    };

    const service = new NotificationsService(prisma as never);

    const result = await service.listUserNotifications({
      accountType: "ATTENDEE",
      appRoles: ["attendee"],
      email: "ada@student.ie",
      id: "user_1",
      memberships: [],
      platformRoles: [],
      profile: null,
      status: "ACTIVE",
    }, {});

    expect(prisma.userNotification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 11,
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "notification_1",
          status: "UNREAD",
          title: "Transfer started",
          type: "TRANSFER_CREATED",
        }),
      ],
      nextCursor: null,
    });
  });

  it("returns a next cursor when more notifications are available", async () => {
    const prisma = {
      userNotification: {
        findMany: vi.fn().mockResolvedValue([
          {
            actionUrl: null,
            body: "One",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            id: "notification_1",
            metadata: null,
            readAt: null,
            status: "UNREAD",
            title: "One",
            type: "TRANSFER_CREATED",
          },
          {
            actionUrl: null,
            body: "Two",
            createdAt: new Date("2026-05-01T09:00:00.000Z"),
            id: "notification_2",
            metadata: null,
            readAt: null,
            status: "UNREAD",
            title: "Two",
            type: "TRANSFER_CREATED",
          },
          {
            actionUrl: null,
            body: "Three",
            createdAt: new Date("2026-05-01T08:00:00.000Z"),
            id: "notification_3",
            metadata: null,
            readAt: null,
            status: "UNREAD",
            title: "Three",
            type: "TRANSFER_CREATED",
          },
        ]),
      },
    };

    const service = new NotificationsService(prisma as never);

    const result = await service.listUserNotifications(
      {
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "ada@student.ie",
        id: "user_1",
        memberships: [],
        platformRoles: [],
        profile: null,
        status: "ACTIVE",
      },
      { limit: 2 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("notification_2");
  });

  it("marks an unread notification as read", async () => {
    const prisma = {
      userNotification: {
        findFirst: vi.fn().mockResolvedValue({
          actionUrl: "/wallet/CNT-GA-0001",
          body: "Your transfer is pending acceptance.",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "notification_1",
          metadata: { serialNumber: "CNT-GA-0001" },
          readAt: null,
          status: "UNREAD",
          title: "Transfer started",
          type: "TRANSFER_CREATED",
          userId: "user_1",
        }),
        update: vi.fn().mockResolvedValue({
          actionUrl: "/wallet/CNT-GA-0001",
          body: "Your transfer is pending acceptance.",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          id: "notification_1",
          metadata: { serialNumber: "CNT-GA-0001" },
          readAt: new Date("2026-05-01T11:00:00.000Z"),
          status: "READ",
          title: "Transfer started",
          type: "TRANSFER_CREATED",
        }),
      },
    };

    const service = new NotificationsService(prisma as never);

    const result = await service.markNotificationAsRead("notification_1", {
      accountType: "ATTENDEE",
      appRoles: ["attendee"],
      email: "ada@student.ie",
      id: "user_1",
      memberships: [],
      platformRoles: [],
      profile: null,
      status: "ACTIVE",
    });

    expect(prisma.userNotification.update).toHaveBeenCalledWith({
      where: { id: "notification_1" },
      data: {
        readAt: expect.any(Date),
        status: "READ",
      },
    });
    expect(result.status).toBe("READ");
  });

  it("creates post-event notifications for eligible ticket owners", async () => {
    const prisma = {
      $transaction: vi.fn().mockResolvedValue([]),
      ticket: {
        findMany: vi.fn().mockResolvedValue([
          { currentOwnerId: "user_1" },
          { currentOwnerId: "user_2" },
        ]),
      },
      userNotification: {
        create: vi.fn().mockImplementation((input) => input),
      },
    };

    const service = new NotificationsService(prisma as never);

    await service.notifyPostEventPublished({
      eventId: "event_1",
      eventSlug: "campus-neon-takeover",
      eventTitle: "Campus Neon Takeover",
    });

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
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
