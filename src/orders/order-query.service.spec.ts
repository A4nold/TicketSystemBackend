import { NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma, TicketStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentsService } from "../payments/payments.service";
import { OrderQueryService } from "./order-query.service";

function createAuthenticatedUser() {
  return {
    accountType: "ATTENDEE" as const,
    appRoles: ["attendee"],
    email: "ada@student.ie",
    id: "user_123",
    memberships: [],
    platformRoles: [],
    profile: {
      firstName: "Ada",
      lastName: "Eze",
    },
    status: "ACTIVE",
  };
}

function createOrder(overrides?: Partial<any>) {
  return {
    cancelledAt: null,
    checkoutSessionId: "cs_test_123",
    checkoutStatus: "open",
    checkoutUrl: "https://checkout.stripe.test/session",
    currency: "EUR",
    event: {
      id: "event_1",
      slug: "campus-neon-takeover",
      startsAt: new Date("2026-05-01T21:00:00.000Z"),
      title: "Campus Neon Takeover",
    },
    feeAmount: new Prisma.Decimal("1.50"),
    id: "order_123",
    idempotencyKey: "idem_123",
    isAwaitingPaymentConfirmation: true,
    items: [
      {
        quantity: 1,
        ticketType: {
          currency: "EUR",
          name: "General Admission",
        },
        ticketTypeId: "ticket_type_1",
        totalPrice: new Prisma.Decimal("15.00"),
        unitPrice: new Prisma.Decimal("15.00"),
      },
    ],
    paidAt: null,
    paymentProvider: PaymentProvider.STRIPE,
    paymentReference: null,
    paymentStatus: "unpaid",
    paymentTransactions: [],
    status: OrderStatus.PENDING,
    subtotalAmount: new Prisma.Decimal("15.00"),
    tickets: [
      {
        id: "ticket_1",
        issuedAt: new Date("2026-04-10T12:00:00.000Z"),
        ownershipRevision: 1,
        qrTokenId: "qr_123",
        serialNumber: "CNT-GA-0001",
        status: TicketStatus.ISSUED,
      },
    ],
    totalAmount: new Prisma.Decimal("16.50"),
    userId: "user_123",
    ...overrides,
  };
}

describe("OrderQueryService", () => {
  const prisma = {
    order: {
      findFirst: vi.fn(),
    },
  };
  const paymentsService = {
    reconcilePendingOrderWithProvider: vi.fn(),
  };

  let service: OrderQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderQueryService(
      prisma as never,
      paymentsService as unknown as PaymentsService,
    );
  });

  it("returns an order by checkout session id for the authenticated user", async () => {
    prisma.order.findFirst.mockResolvedValue(createOrder());
    paymentsService.reconcilePendingOrderWithProvider.mockResolvedValue(null);

    const result = await service.getOrderByCheckoutSessionId(
      "cs_test_123",
      createAuthenticatedUser(),
    );

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          checkoutSessionId: "cs_test_123",
          userId: "user_123",
        },
      }),
    );
    expect(result.id).toBe("order_123");
    expect(result.checkoutSessionId).toBe("cs_test_123");
  });

  it("rejects lookup when no matching order exists", async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.getOrderByCheckoutSessionId("missing_session", createAuthenticatedUser()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns an order by payment intent id for the authenticated user", async () => {
    prisma.order.findFirst.mockResolvedValue(
      createOrder({
        paymentTransactions: [
          {
            connectedAccountId: "acct_123",
            id: "txn_123",
            providerPaymentIntentId: "pi_123",
            status: "PENDING",
          },
        ],
      }),
    );
    paymentsService.reconcilePendingOrderWithProvider.mockResolvedValue(null);

    const result = await service.getOrderByPaymentIntentId(
      "pi_123",
      createAuthenticatedUser(),
    );

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_123",
          paymentTransactions: {
            some: {
              providerPaymentIntentId: "pi_123",
            },
          },
        },
      }),
    );
    expect(result.id).toBe("order_123");
  });
});
