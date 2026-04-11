import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { EventLifecycleService } from "./event-lifecycle.service";
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
      event: {
        findUnique: vi.fn(),
      },
    };
    const lifecycle = {
      createEvent: vi.fn().mockRejectedValue(new ForbiddenException()),
      updateEvent: vi.fn(),
    };
    const service = new EventsService(
      prisma as never,
      lifecycle as unknown as EventLifecycleService,
    );

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

    expect(lifecycle.createEvent).toHaveBeenCalledTimes(1);
  });

  it("allows organizer-capable users to proceed into event creation", async () => {
    const createdEvent = {
      allowResale: false,
      coverImageUrl: null,
      description: null,
      endsAt: null,
      id: "event_123",
      metrics: {
        resaleListings: 0,
        scanAttempts: 0,
        tickets: 0,
      },
      organizer: {
        email: "organizer@example.com",
        firstName: "Test",
        id: "user_123",
        lastName: "User",
      },
      resaleWindow: null,
      salesWindow: null,
      slug: "organizer-event",
      staff: [],
      startsAt: new Date("2026-05-15T20:00:00.000Z"),
      status: "DRAFT",
      ticketTypes: [],
      timezone: "Europe/Dublin",
      title: "Organizer Event",
      venueAddress: null,
      venueName: null,
    };
    const prisma = {
      event: {
        findUnique: vi.fn(),
      },
    };
    const lifecycle = {
      createEvent: vi.fn().mockResolvedValue(createdEvent),
      updateEvent: vi.fn(),
    };
    const service = new EventsService(
      prisma as never,
      lifecycle as unknown as EventLifecycleService,
    );

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

    expect(lifecycle.createEvent).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("event_123");
    expect(result.organizer.email).toBe("organizer@example.com");
  });
});

describe("EventsService response mapping", () => {
  it("maps created event responses with organizer, resale window, and metrics shape", async () => {
    const createdEvent = {
      allowResale: true,
      coverImageUrl: null,
      description: "Main event description",
      endsAt: null,
      id: "event_123",
      metrics: {
        resaleListings: 0,
        scanAttempts: 0,
        tickets: 3,
      },
      organizer: {
        email: "organizer@example.com",
        firstName: "Test",
        id: "user_123",
        lastName: "User",
      },
      resaleWindow: {
        endsAt: new Date("2026-05-15T19:30:00.000Z"),
        maxResalePrice: "40.00",
        startsAt: new Date("2026-05-10T12:00:00.000Z"),
      },
      salesWindow: null,
      slug: "organizer-event",
      staff: [],
      startsAt: new Date("2026-05-15T20:00:00.000Z"),
      status: "DRAFT",
      ticketTypes: [
        {
          currency: "EUR",
          description: "General access",
          id: "ticket_type_1",
          isActive: true,
          maxPerOrder: 4,
          name: "General Admission",
          price: "25.00",
          quantity: 250,
          saleEndsAt: null,
          saleStartsAt: null,
        },
      ],
      timezone: "Europe/Dublin",
      title: "Organizer Event",
      venueAddress: null,
      venueName: null,
    };
    const prisma = {
      event: {
        findUnique: vi.fn(),
      },
    };
    const lifecycle = {
      createEvent: vi.fn().mockResolvedValue(createdEvent),
      updateEvent: vi.fn(),
    };
    const service = new EventsService(
      prisma as never,
      lifecycle as unknown as EventLifecycleService,
    );

    const result = await service.createEvent(
      {
        allowResale: true,
        maxResalePrice: "40.00",
        resaleEndsAt: "2026-05-15T19:30:00.000Z",
        resaleStartsAt: "2026-05-10T12:00:00.000Z",
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

    expect(result.organizer).toEqual({
      email: "organizer@example.com",
      firstName: "Test",
      id: "user_123",
      lastName: "User",
    });
    expect(result.ticketTypes).toEqual([
      {
        currency: "EUR",
        description: "General access",
        id: "ticket_type_1",
        isActive: true,
        maxPerOrder: 4,
        name: "General Admission",
        price: "25.00",
        quantity: 250,
        saleEndsAt: null,
        saleStartsAt: null,
      },
    ]);
    expect(result.resaleWindow).toEqual({
      endsAt: new Date("2026-05-15T19:30:00.000Z"),
      maxResalePrice: "40.00",
      startsAt: new Date("2026-05-10T12:00:00.000Z"),
    });
    expect(result.metrics).toEqual({
      resaleListings: 0,
      scanAttempts: 0,
      tickets: 3,
    });
  });
});
