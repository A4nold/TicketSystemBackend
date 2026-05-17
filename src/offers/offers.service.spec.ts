import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { OffersService } from "./offers.service";

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

describe("OffersService", () => {
  it("creates offer request for offer-range ticket types", async () => {
    const prisma = {
      ticketType: {
        findFirst: vi.fn().mockResolvedValue({
          id: "tt_1",
          eventId: "event_1",
          name: "VIP",
          pricingMode: "OFFER_RANGE",
          minOfferPrice: new Prisma.Decimal("5.00"),
          maxOfferPrice: new Prisma.Decimal("200.00"),
          offerAutoExpireMinutes: 30,
          currency: "EUR",
          event: { id: "event_1" },
        }),
      },
      ticketOfferRequest: {
        create: vi.fn().mockResolvedValue({
          id: "offer_1",
          eventId: "event_1",
          ticketTypeId: "tt_1",
          attendeeUserId: "user_123",
          offeredPrice: new Prisma.Decimal("35.00"),
          currency: "EUR",
          status: "PENDING",
          organizerNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          expiresAt: new Date("2026-05-17T12:00:00.000Z"),
          checkoutUnlockToken: null,
          createdAt: new Date("2026-05-17T11:30:00.000Z"),
          updatedAt: new Date("2026-05-17T11:30:00.000Z"),
          attendeeUser: {
            id: "user_123",
            email: "attendee@example.com",
            profile: { firstName: "Test", lastName: "User" },
          },
          ticketType: {
            id: "tt_1",
            name: "VIP",
          },
        }),
      },
      staffMembership: {
        findMany: vi.fn().mockResolvedValue([{ userId: "org_1" }]),
      },
    };

    const notificationsService = {
      createUserNotification: vi.fn().mockResolvedValue(undefined),
    };

    const service = new OffersService(prisma as never, notificationsService as never);

    const result = await service.createOfferRequest(
      "event_1",
      "tt_1",
      { offeredPrice: "35.00" },
      createAuthenticatedUser(),
    );

    expect(result.status).toBe("PENDING");
    expect(notificationsService.createUserNotification).toHaveBeenCalledTimes(1);
  });

  it("rejects out-of-range offers", async () => {
    const prisma = {
      ticketType: {
        findFirst: vi.fn().mockResolvedValue({
          id: "tt_1",
          eventId: "event_1",
          name: "VIP",
          pricingMode: "OFFER_RANGE",
          minOfferPrice: new Prisma.Decimal("5.00"),
          maxOfferPrice: new Prisma.Decimal("200.00"),
          offerAutoExpireMinutes: 30,
          currency: "EUR",
          event: { id: "event_1" },
        }),
      },
    };

    const service = new OffersService(
      prisma as never,
      { createUserNotification: vi.fn() } as never,
    );

    await expect(
      service.createOfferRequest(
        "event_1",
        "tt_1",
        { offeredPrice: "300.00" },
        createAuthenticatedUser(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects organizer review when user has no organizer access", async () => {
    const prisma = {
      ticketOfferRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "offer_1",
          eventId: "event_1",
          ticketTypeId: "tt_1",
          attendeeUserId: "att_1",
          offeredPrice: new Prisma.Decimal("50.00"),
          currency: "EUR",
          status: "PENDING",
          organizerNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          checkoutUnlockToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          attendeeUser: {
            id: "att_1",
            email: "attendee@example.com",
            profile: { firstName: "Att", lastName: "Endee" },
          },
          ticketType: {
            id: "tt_1",
            name: "VIP",
          },
        }),
      },
      staffMembership: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new OffersService(
      prisma as never,
      { createUserNotification: vi.fn() } as never,
    );

    await expect(
      service.acceptOfferRequest(
        "offer_1",
        {},
        createAuthenticatedUser({ id: "user_no_access" }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
