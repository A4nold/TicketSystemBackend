import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  OrderStatus,
  PaymentProvider,
  Prisma,
  TicketStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutService } from "./checkout.service";
import { OrderPaymentService } from "./order-payment.service";
import { OrdersService } from "./orders.service";

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
    checkoutSessionId: "chk_existing",
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
    ...overrides,
  };
}

describe("OrdersService", () => {
  const prisma = {
    order: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      groupBy: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
  };
  const checkoutService = {
    createCheckout: vi.fn(),
  };
  const orderPaymentService = {
    confirmPayment: vi.fn(),
  };

  let service: OrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrdersService(
      prisma as never,
      checkoutService as unknown as CheckoutService,
      orderPaymentService as unknown as OrderPaymentService,
    );
  });

  describe("createCheckout", () => {
    it("returns an existing order for the same user idempotency key", async () => {
      checkoutService.createCheckout.mockResolvedValue(createOrder());

      const result = await service.createCheckout(
        {
          eventSlug: "campus-neon-takeover",
          idempotencyKey: "idem_123",
          items: [{ quantity: 1, ticketTypeId: "ticket_type_1" }],
          paymentProvider: PaymentProvider.STRIPE,
        },
        createAuthenticatedUser(),
      );

      expect(checkoutService.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: "idem_123",
        }),
        expect.objectContaining({
          id: "user_123",
        }),
      );
      expect(result.id).toBe("order_123");
      expect(result.checkoutSessionId).toBe("chk_existing");
    });
  });

  describe("cancelOrder", () => {
    it("cancels a pending order and records a reason-backed payment reference when missing", async () => {
      prisma.order.findFirst.mockResolvedValue(createOrder());
      prisma.order.update.mockResolvedValue(
        createOrder({
          cancelledAt: new Date("2026-04-10T12:30:00.000Z"),
          paymentReference: "cancelled:user_request",
          status: OrderStatus.CANCELLED,
        }),
      );

      const result = await service.cancelOrder(
        "order_123",
        { reason: "user_request" },
        createAuthenticatedUser(),
      );

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentReference: "cancelled:user_request",
            status: OrderStatus.CANCELLED,
          }),
          where: { id: "order_123" },
        }),
      );
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.paymentReference).toBe("cancelled:user_request");
    });

    it("rejects cancellation when the order is not found", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelOrder(
          "missing_order",
          { reason: "user_request" },
          createAuthenticatedUser(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects cancellation for non-pending orders", async () => {
      prisma.order.findFirst.mockResolvedValue(
        createOrder({
          status: OrderStatus.PAID,
        }),
      );

      await expect(
        service.cancelOrder(
          "order_123",
          { reason: "user_request" },
          createAuthenticatedUser(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
