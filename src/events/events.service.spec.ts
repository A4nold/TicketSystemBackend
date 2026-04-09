import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { EventsService } from "./events.service";

function createAuthenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user_123",
    email: "attendee@example.com",
    accountType: "ATTENDEE",
    status: "ACTIVE",
    appRoles: ["attendee"],
    memberships: [],
    platformRoles: [],
    profile: {
      firstName: "Test",
      lastName: "User",
    },
    ...overrides,
  };
}

describe("EventsService.createEvent", () => {
  it("rejects users without organizer capability before touching Prisma", async () => {
    const prisma = {
      $transaction: vi.fn(),
    };
    const service = new EventsService(prisma as never);

    await expect(
      service.createEvent(
        {
          allowResale: false,
          startsAt: "2026-05-15T20:00:00.000Z",
          status: "DRAFT",
          timezone: "Europe/Dublin",
          title: "Unauthorized Event",
        },
        createAuthenticatedUser(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows organizer-capable users to proceed into event creation", async () => {
    const createdEvent = {
      allowResale: false,
      coverImageUrl: null,
      description: null,
      endsAt: null,
      id: "event_123",
      organizer: {
        id: "user_123",
        email: "organizer@example.com",
        profile: {
          firstName: "Test",
          lastName: "User",
        },
      },
      resaleEndsAt: null,
      resaleStartsAt: null,
      salesEndAt: null,
      salesStartAt: null,
      slug: "organizer-event",
      staffMemberships: [],
      startsAt: new Date("2026-05-15T20:00:00.000Z"),
      status: "DRAFT",
      ticketTypes: [],
      timezone: "Europe/Dublin",
      title: "Organizer Event",
      venueAddress: null,
      venueName: null,
      _count: {
        resaleListings: 0,
        scanAttempts: 0,
        tickets: 0,
      },
      maxResalePrice: null,
    };
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          event: {
            create: vi.fn().mockResolvedValue({ id: "event_123" }),
            findUniqueOrThrow: vi.fn().mockResolvedValue(createdEvent),
          },
          staffMembership: {
            create: vi.fn().mockResolvedValue({}),
          },
        }),
      ),
    };
    const service = new EventsService(prisma as never);

    const result = await service.createEvent(
      {
        allowResale: false,
        startsAt: "2026-05-15T20:00:00.000Z",
        status: "DRAFT",
        timezone: "Europe/Dublin",
        title: "Organizer Event",
      },
      createAuthenticatedUser({
        accountType: "ORGANIZER",
        appRoles: ["attendee", "organizer"],
        email: "organizer@example.com",
        platformRoles: ["EVENT_OWNER"],
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("event_123");
    expect(result.organizer.email).toBe("organizer@example.com");
  });
});
