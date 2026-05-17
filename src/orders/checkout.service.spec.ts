import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CheckoutService } from "./checkout.service";

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

describe("CheckoutService", () => {
  it("rejects offer-range quote when unlock fields are missing", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event_1",
          slug: "campus-neon",
          title: "Campus Neon",
          startsAt: new Date("2026-05-20T19:00:00.000Z"),
          status: "PUBLISHED",
          salesStartAt: null,
          salesEndAt: null,
          ticketTypes: [
            {
              id: "tt_offer",
              name: "Offer Pass",
              price: new Prisma.Decimal("20.00"),
              pricingMode: "OFFER_RANGE",
              currency: "EUR",
              quantity: 100,
              maxPerOrder: 2,
              saleStartsAt: null,
              saleEndsAt: null,
              isActive: true,
            },
          ],
        }),
      },
      orderItem: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      ticketOfferRequest: {
        findUnique: vi.fn(),
      },
    };

    const service = new CheckoutService(
      prisma as never,
      { createCheckoutSession: vi.fn(), createPaystackCheckoutTransaction: vi.fn() } as never,
      { issuePurchasedTickets: vi.fn() } as never,
      { notifyOrderPaid: vi.fn() } as never,
    );

    await expect(
      service.quoteCheckout(
        {
          eventSlug: "campus-neon",
          items: [{ ticketTypeId: "tt_offer", quantity: 1 }],
        },
        createAuthenticatedUser(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("auto-completes free checkout without payment session", async () => {
    const issuePurchasedTickets = vi.fn().mockResolvedValue(undefined);
    const notifyOrderPaid = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event_1",
          slug: "campus-neon",
          title: "Campus Neon",
          startsAt: new Date("2026-05-20T19:00:00.000Z"),
          status: "PUBLISHED",
          salesStartAt: null,
          salesEndAt: null,
          ticketTypes: [
            {
              id: "tt_free",
              name: "Guest List",
              price: new Prisma.Decimal("0.00"),
              pricingMode: "FREE",
              currency: "EUR",
              quantity: 100,
              maxPerOrder: 4,
              saleStartsAt: null,
              saleEndsAt: null,
              isActive: true,
            },
          ],
        }),
      },
      orderItem: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      ticketOfferRequest: {
        updateMany: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: "order_1",
          userId: "user_123",
          eventId: "event_1",
          status: "PENDING",
          currency: "EUR",
          subtotalAmount: new Prisma.Decimal("0.00"),
          feeAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal("0.00"),
          paymentProvider: "STRIPE",
          paymentReference: null,
          checkoutSessionId: "chk_x",
          idempotencyKey: null,
          paidAt: null,
          cancelledAt: null,
          event: {
            id: "event_1",
            slug: "campus-neon",
            title: "Campus Neon",
            startsAt: new Date("2026-05-20T19:00:00.000Z"),
          },
          items: [
            {
              ticketTypeId: "tt_free",
              quantity: 1,
              unitPrice: new Prisma.Decimal("0.00"),
              totalPrice: new Prisma.Decimal("0.00"),
              ticketType: {
                name: "Guest List",
                description: null,
                currency: "EUR",
              },
            },
          ],
          tickets: [],
        }),
        update: vi.fn().mockResolvedValue({
          id: "order_1",
          userId: "user_123",
          eventId: "event_1",
          status: "PAID",
          currency: "EUR",
          subtotalAmount: new Prisma.Decimal("0.00"),
          feeAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal("0.00"),
          paymentProvider: "STRIPE",
          paymentReference: "free:order_1",
          checkoutSessionId: null,
          idempotencyKey: null,
          paidAt: new Date("2026-05-17T12:00:00.000Z"),
          cancelledAt: null,
          event: {
            id: "event_1",
            slug: "campus-neon",
            title: "Campus Neon",
            startsAt: new Date("2026-05-20T19:00:00.000Z"),
          },
          items: [
            {
              ticketTypeId: "tt_free",
              quantity: 1,
              unitPrice: new Prisma.Decimal("0.00"),
              totalPrice: new Prisma.Decimal("0.00"),
              ticketType: {
                name: "Guest List",
                description: null,
                currency: "EUR",
              },
            },
          ],
          tickets: [],
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "order_1",
          userId: "user_123",
          eventId: "event_1",
          status: "PAID",
          currency: "EUR",
          subtotalAmount: new Prisma.Decimal("0.00"),
          feeAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal("0.00"),
          paymentProvider: "STRIPE",
          paymentReference: "free:order_1",
          checkoutSessionId: null,
          idempotencyKey: null,
          paidAt: new Date("2026-05-17T12:00:00.000Z"),
          cancelledAt: null,
          event: {
            id: "event_1",
            slug: "campus-neon",
            title: "Campus Neon",
            startsAt: new Date("2026-05-20T19:00:00.000Z"),
          },
          items: [
            {
              ticketTypeId: "tt_free",
              quantity: 1,
              unitPrice: new Prisma.Decimal("0.00"),
              totalPrice: new Prisma.Decimal("0.00"),
              ticketType: {
                name: "Guest List",
                description: null,
                currency: "EUR",
              },
            },
          ],
          tickets: [
            {
              id: "ticket_1",
              serialNumber: "CNT-GL-0001",
              status: "ISSUED",
              qrTokenId: "qr_1",
              ownershipRevision: 1,
              issuedAt: new Date("2026-05-17T12:00:00.000Z"),
            },
          ],
        }),
      },
      $transaction: vi.fn(async (handler: (tx: any) => Promise<any>) =>
        handler({
          order: {
            update: prisma.order.update,
            findUniqueOrThrow: prisma.order.findUniqueOrThrow,
          },
        }),
      ),
    };

    const service = new CheckoutService(
      prisma as never,
      { createCheckoutSession: vi.fn(), createPaystackCheckoutTransaction: vi.fn() } as never,
      { issuePurchasedTickets } as never,
      { notifyOrderPaid } as never,
    );

    const result = await service.createCheckout(
      {
        eventSlug: "campus-neon",
        items: [{ ticketTypeId: "tt_free", quantity: 1 }],
      },
      createAuthenticatedUser(),
    );

    expect(result.status).toBe("PAID");
    expect(issuePurchasedTickets).toHaveBeenCalledTimes(1);
    expect(notifyOrderPaid).toHaveBeenCalledTimes(1);
  });
});
