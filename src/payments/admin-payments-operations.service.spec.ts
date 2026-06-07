import { OrderStatus, PaymentProvider, Prisma, SettlementState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPaymentsOperationsService } from "./admin-payments-operations.service";

describe("AdminPaymentsOperationsService", () => {
  const prisma = {
    dispute: {
      findMany: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    organizerEarning: {
      findMany: vi.fn(),
    },
    paymentTransaction: {
      findMany: vi.fn(),
    },
    refund: {
      findMany: vi.fn(),
    },
  };
  const paymentsService = {
    repairOrderPayment: vi.fn(),
    replayStoredWebhook: vi.fn(),
    syncStripeAccount: vi.fn(),
    syncStripeCharge: vi.fn(),
    syncStripeDispute: vi.fn(),
    syncStripePaymentIntent: vi.fn(),
    syncStripeRefund: vi.fn(),
  };
  const webhookEventRepository = {
    listFailures: vi.fn(),
  };

  let service: AdminPaymentsOperationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminPaymentsOperationsService(
      prisma as never,
      paymentsService as never,
      webhookEventRepository as never,
    );
  });

  it("lists webhook failures via repository", async () => {
    webhookEventRepository.listFailures.mockResolvedValue([
      {
        createdAt: new Date("2026-06-05T12:00:00.000Z"),
        deliveryAttempts: 2,
        eventType: "charge.refunded",
        id: "wh_1",
        lastAttemptAt: new Date("2026-06-05T12:10:00.000Z"),
        processedAt: null,
        processingError: "boom",
        provider: PaymentProvider.STRIPE,
        providerEventId: "evt_1",
      },
    ]);

    const result = await service.listWebhookFailures(10, PaymentProvider.STRIPE);

    expect(webhookEventRepository.listFailures).toHaveBeenCalledWith(
      10,
      PaymentProvider.STRIPE,
    );
    expect(result).toHaveLength(1);
  });

  it("builds payment exceptions from multiple sources", async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        {
          id: "order_paid_missing_tickets",
          status: OrderStatus.PAID,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "order_pending_reconcile",
          paymentTransactions: [{ id: "pt_1" }],
          status: OrderStatus.PENDING,
        },
      ]);
    webhookEventRepository.listFailures.mockResolvedValue([
      {
        processingError: "failed webhook",
        providerEventId: "evt_1",
      },
    ]);
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        id: "pt_hold",
        orderId: "order_hold",
      },
    ]);
    prisma.refund.findMany.mockResolvedValue([
      {
        id: "refund_processing",
        orderId: "order_1",
        paymentTransactionId: "pt_1",
      },
    ]);
    prisma.dispute.findMany.mockResolvedValue([
      {
        id: "dispute_1",
        paymentTransactionId: "pt_2",
      },
    ]);

    const result = await service.listPaymentExceptions(20);

    expect(result.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "PAID_ORDER_MISSING_TICKETS",
        "PENDING_ORDER_NEEDS_RECONCILIATION",
        "WEBHOOK_PROCESSING_FAILED",
        "TRANSACTION_ON_HOLD",
        "REFUND_STILL_PROCESSING",
        "DISPUTE_NEEDS_RESPONSE",
      ]),
    );
  });

  it("builds reconciliation summary totals", async () => {
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        currency: "EUR",
        grossAmount: new Prisma.Decimal("100.00"),
        organizerNetAmount: new Prisma.Decimal("90.00"),
        platformFeeAmount: new Prisma.Decimal("10.00"),
      },
    ]);
    prisma.organizerEarning.findMany.mockResolvedValue([
      {
        netAmount: new Prisma.Decimal("90.00"),
        settlementState: SettlementState.SETTLED,
      },
    ]);
    prisma.refund.findMany.mockResolvedValue([
      {
        amount: new Prisma.Decimal("5.00"),
        status: "SUCCEEDED",
      },
    ]);
    prisma.dispute.findMany.mockResolvedValue([
      {
        amount: new Prisma.Decimal("16.50"),
      },
    ]);

    const result = await service.getSettlementReconciliationSummary();

    expect(result).toEqual(
      expect.objectContaining({
        currency: "EUR",
        disputeExposureAmount: "16.50",
        grossSales: "100.00",
        organizerEarningsTotal: "90.00",
        organizerNet: "90.00",
        platformFees: "10.00",
        refundedAmount: "5.00",
        settledEarnings: "90.00",
      }),
    );
  });
});
