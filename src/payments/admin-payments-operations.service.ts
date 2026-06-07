import { Injectable } from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma, SettlementState } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { PaymentsService } from "./payments.service";
import { WebhookEventRepository } from "./repositories/webhook-event.repository";

@Injectable()
export class AdminPaymentsOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly webhookEventRepository: WebhookEventRepository,
  ) {}

  listWebhookFailures(limit = 25, provider?: PaymentProvider) {
    return this.webhookEventRepository.listFailures(limit, provider);
  }

  replayWebhook(providerEventId: string) {
    return this.paymentsService.replayStoredWebhook(providerEventId);
  }

  syncStripeAccount(accountId: string) {
    return this.paymentsService.syncStripeAccount(accountId);
  }

  syncStripePaymentIntent(paymentIntentId: string) {
    return this.paymentsService.syncStripePaymentIntent(paymentIntentId);
  }

  syncStripeCharge(chargeId: string) {
    return this.paymentsService.syncStripeCharge(chargeId);
  }

  syncStripeRefund(refundId: string) {
    return this.paymentsService.syncStripeRefund(refundId);
  }

  syncStripeDispute(disputeId: string) {
    return this.paymentsService.syncStripeDispute(disputeId);
  }

  repairOrderPayment(orderId: string) {
    return this.paymentsService.repairOrderPayment(orderId);
  }

  async listPaymentExceptions(limit = 50) {
    const [paidWithoutTickets, stuckPendingOrders, failedWebhooks, onHoldTransactions, processingRefunds, openDisputes] =
      await Promise.all([
        this.prisma.order.findMany({
          where: {
            status: OrderStatus.PAID,
            tickets: {
              none: {},
            },
          },
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        this.prisma.order.findMany({
          where: {
            status: OrderStatus.PENDING,
            OR: [
              {
                paymentProvider: PaymentProvider.STRIPE,
                checkoutSessionId: null,
                paymentTransactions: {
                  some: {
                    status: {
                      in: ["PENDING", "PROCESSING", "REQUIRES_ACTION"],
                    },
                  },
                },
              },
              {
                paymentProvider: PaymentProvider.PAYSTACK,
                checkoutSessionId: null,
              },
            ],
          },
          include: {
            paymentTransactions: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        this.webhookEventRepository.listFailures(limit),
        this.prisma.paymentTransaction.findMany({
          where: {
            settlementState: SettlementState.ON_HOLD,
          },
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        this.prisma.refund.findMany({
          where: {
            status: {
              in: ["REQUESTED", "PROCESSING"],
            },
          },
          take: limit,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        this.prisma.dispute.findMany({
          where: {
            needsResponse: true,
          },
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

    return [
      ...paidWithoutTickets.map((order) => ({
        code: "PAID_ORDER_MISSING_TICKETS",
        severity: "HIGH" as const,
        entityType: "order",
        entityId: order.id,
        message: "Order is paid but no tickets were issued.",
        orderId: order.id,
        paymentTransactionId: null,
      })),
      ...stuckPendingOrders.map((order) => ({
        code: "PENDING_ORDER_NEEDS_RECONCILIATION",
        severity: "MEDIUM" as const,
        entityType: "order",
        entityId: order.id,
        message: "Pending order has unresolved provider payment state.",
        orderId: order.id,
        paymentTransactionId: order.paymentTransactions[0]?.id ?? null,
      })),
      ...failedWebhooks.map((event) => ({
        code: "WEBHOOK_PROCESSING_FAILED",
        severity: "HIGH" as const,
        entityType: "webhook_event",
        entityId: event.providerEventId,
        message: event.processingError ?? "Webhook processing failed.",
        orderId: null,
        paymentTransactionId: null,
      })),
      ...onHoldTransactions.map((transaction) => ({
        code: "TRANSACTION_ON_HOLD",
        severity: "MEDIUM" as const,
        entityType: "payment_transaction",
        entityId: transaction.id,
        message: "Transaction settlement is on hold.",
        orderId: transaction.orderId,
        paymentTransactionId: transaction.id,
      })),
      ...processingRefunds.map((refund) => ({
        code: "REFUND_STILL_PROCESSING",
        severity: "MEDIUM" as const,
        entityType: "refund",
        entityId: refund.id,
        message: "Refund has not reached a terminal state.",
        orderId: refund.orderId,
        paymentTransactionId: refund.paymentTransactionId,
      })),
      ...openDisputes.map((dispute) => ({
        code: "DISPUTE_NEEDS_RESPONSE",
        severity: "HIGH" as const,
        entityType: "dispute",
        entityId: dispute.id,
        message: "Dispute requires operational response.",
        orderId: null,
        paymentTransactionId: dispute.paymentTransactionId,
      })),
    ].slice(0, limit);
  }

  async getSettlementReconciliationSummary() {
    const [transactions, earnings, refunds, disputes] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organizerEarning.findMany({
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.refund.findMany({
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.findMany({
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const currency =
      transactions[0]?.currency ??
      earnings[0]?.currency ??
      refunds[0]?.currency ??
      disputes[0]?.currency ??
      "EUR";
    const grossSales = transactions.reduce(
      (sum, transaction) => sum.add(transaction.grossAmount),
      new Prisma.Decimal(0),
    );
    const platformFees = transactions.reduce(
      (sum, transaction) => sum.add(transaction.platformFeeAmount),
      new Prisma.Decimal(0),
    );
    const organizerNet = transactions.reduce(
      (sum, transaction) => sum.add(transaction.organizerNetAmount),
      new Prisma.Decimal(0),
    );
    const organizerEarningsTotal = earnings.reduce(
      (sum, earning) => sum.add(earning.netAmount),
      new Prisma.Decimal(0),
    );
    const settledEarnings = earnings
      .filter((earning) => earning.settlementState === SettlementState.SETTLED)
      .reduce((sum, earning) => sum.add(earning.netAmount), new Prisma.Decimal(0));
    const onHoldEarnings = earnings
      .filter((earning) => earning.settlementState === SettlementState.ON_HOLD)
      .reduce((sum, earning) => sum.add(earning.netAmount), new Prisma.Decimal(0));
    const refundedAmount = refunds
      .filter((refund) => refund.status === "SUCCEEDED")
      .reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    const disputeExposureAmount = disputes.reduce(
      (sum, dispute) => sum.add(dispute.amount),
      new Prisma.Decimal(0),
    );
    const mismatchCount = Math.abs(
      Number(organizerNet.toFixed(2)) - Number(organizerEarningsTotal.toFixed(2)),
    ) > 0.009
      ? 1
      : 0;

    return {
      currency,
      totalTransactions: transactions.length,
      grossSales: grossSales.toFixed(2),
      platformFees: platformFees.toFixed(2),
      organizerNet: organizerNet.toFixed(2),
      organizerEarningsTotal: organizerEarningsTotal.toFixed(2),
      settledEarnings: settledEarnings.toFixed(2),
      onHoldEarnings: onHoldEarnings.toFixed(2),
      refundedAmount: refundedAmount.toFixed(2),
      disputeExposureAmount: disputeExposureAmount.toFixed(2),
      mismatchCount,
    };
  }
}
