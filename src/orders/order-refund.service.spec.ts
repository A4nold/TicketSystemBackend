import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  OrderStatus,
  PaymentProvider,
  Prisma,
  RefundStatus,
  TicketStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderRefundService } from "./order-refund.service";

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

function createRefundableOrder(overrides?: Partial<any>) {
  return {
    event: {
      id: "event_1",
      slug: "campus-neon-takeover",
      title: "Campus Neon Takeover",
    },
    eventId: "event_1",
    id: "order_123",
    paymentProvider: PaymentProvider.STRIPE,
    paymentTransactions: [
      {
        currency: "EUR",
        grossAmount: new Prisma.Decimal("16.50"),
        id: "pt_123",
        providerChargeId: "ch_123",
        providerPaymentIntentId: "pi_123",
        status: "SUCCEEDED",
      },
    ],
    refunds: [],
    status: OrderStatus.PAID,
    tickets: [
      {
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
        currentOwnerId: "user_123",
        id: "ticket_1",
        ownershipRevision: 1,
        status: TicketStatus.ISSUED,
      },
    ],
    userId: "user_123",
    ...overrides,
  };
}

describe("OrderRefundService", () => {
  const prisma = {
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    organizerEarning: {
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      update: vi.fn(),
    },
    refund: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (handler: (tx: any) => Promise<any>) =>
      handler({
        order: prisma.order,
        organizerEarning: prisma.organizerEarning,
        paymentTransaction: prisma.paymentTransaction,
        ticket: prisma.ticket,
      }),
    ),
  };
  const paymentsService = {
    createStripeRefund: vi.fn(),
  };
  const ticketOwnershipHistoryService = {
    recordRefund: vi.fn(),
  };

  let service: OrderRefundService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderRefundService(
      prisma as never,
      paymentsService as never,
      ticketOwnershipHistoryService as never,
    );
  });

  it("lists refunds for an order owned by the user", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "order_123" });
    prisma.refund.findMany.mockResolvedValue([
      {
        amount: new Prisma.Decimal("5.00"),
        createdAt: new Date("2026-06-05T10:00:00.000Z"),
        currency: "EUR",
        failedAt: null,
        failureReason: null,
        id: "refund_1",
        orderId: "order_123",
        paymentTransactionId: "pt_123",
        processedAt: new Date("2026-06-05T10:00:01.000Z"),
        providerRefundId: "re_123",
        reason: "requested_by_customer",
        refundApplicationFee: false,
        requestedAt: new Date("2026-06-05T10:00:00.000Z"),
        requestedByUserId: "user_123",
        reverseTransfer: true,
        status: RefundStatus.SUCCEEDED,
      },
    ]);

    const result = await service.listRefunds("order_123", createAuthenticatedUser());

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("refund_1");
  });

  it("creates a partial refund for a refundable Stripe order", async () => {
    prisma.order.findFirst.mockResolvedValue(createRefundableOrder());
    prisma.refund.create.mockResolvedValue({
      amount: new Prisma.Decimal("5.00"),
      createdAt: new Date("2026-06-05T11:00:00.000Z"),
      currency: "EUR",
      failedAt: null,
      failureReason: null,
      id: "refund_123",
      orderId: "order_123",
      paymentTransactionId: "pt_123",
      processedAt: null,
      providerRefundId: null,
      reason: "requested_by_customer",
      refundApplicationFee: false,
      requestedAt: new Date("2026-06-05T11:00:00.000Z"),
      requestedByUserId: "user_123",
      reverseTransfer: true,
      status: RefundStatus.REQUESTED,
    });
    paymentsService.createStripeRefund.mockResolvedValue({
      failureReason: null,
      providerRefundId: "re_123",
      status: RefundStatus.SUCCEEDED,
    });
    prisma.refund.update.mockResolvedValue({
      amount: new Prisma.Decimal("5.00"),
      createdAt: new Date("2026-06-05T11:00:00.000Z"),
      currency: "EUR",
      failedAt: null,
      failureReason: null,
      id: "refund_123",
      orderId: "order_123",
      paymentTransactionId: "pt_123",
      processedAt: new Date("2026-06-05T11:00:01.000Z"),
      providerRefundId: "re_123",
      reason: "requested_by_customer",
      refundApplicationFee: false,
      requestedAt: new Date("2026-06-05T11:00:00.000Z"),
      requestedByUserId: "user_123",
      reverseTransfer: true,
      status: RefundStatus.SUCCEEDED,
    });

    const result = await service.createRefund(
      "order_123",
      { amount: 5, reason: "requested_by_customer" },
      createAuthenticatedUser(),
    );

    expect(paymentsService.createStripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: expect.any(Prisma.Decimal),
        paymentTransactionId: "pt_123",
        refundApplicationFee: false,
      }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrderStatus.PARTIALLY_REFUNDED,
        }),
      }),
    );
    expect(result.providerRefundId).toBe("re_123");
  });

  it("rejects refund creation for an unknown order", async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.createRefund("missing_order", {}, createAuthenticatedUser()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects refund creation when amount exceeds remaining refundable amount", async () => {
    prisma.order.findFirst.mockResolvedValue(createRefundableOrder());

    await expect(
      service.createRefund(
        "order_123",
        { amount: 100 },
        createAuthenticatedUser(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
