import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  OrderStatus,
  PaymentProvider,
  Prisma,
  RefundStatus,
  TicketStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { toRefundResponse } from "./mappers/refund-response.mapper";

@Injectable()
export class OrderRefundService {
  private readonly logger = new Logger(OrderRefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ticketOwnershipHistoryService: TicketOwnershipHistoryService,
  ) {}

  async listRefunds(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" was not found.`);
    }

    const refunds = await this.prisma.refund.findMany({
      where: {
        orderId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return refunds.map((refund) => toRefundResponse(refund));
  }

  async createRefund(
    orderId: string,
    payload: CreateRefundDto,
    user: AuthenticatedUser,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: {
        event: true,
        paymentTransactions: {
          where: {
            provider: PaymentProvider.STRIPE,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        refunds: {
          orderBy: {
            createdAt: "desc",
          },
        },
        tickets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" was not found.`);
    }

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Order "${orderId}" is in "${order.status}" state and cannot be refunded.`,
      );
    }

    if (order.paymentProvider !== PaymentProvider.STRIPE) {
      throw new BadRequestException(
        "Refund orchestration is currently supported for Stripe orders only.",
      );
    }

    const paymentTransaction = order.paymentTransactions[0];

    if (!paymentTransaction) {
      throw new BadRequestException(
        `Order "${orderId}" does not have a refundable Stripe payment transaction.`,
      );
    }

    if (paymentTransaction.status !== "SUCCEEDED") {
      throw new BadRequestException(
        `Payment transaction "${paymentTransaction.id}" is not in a refundable state.`,
      );
    }

    const existingInFlightRefund = order.refunds.find(
      (refund) =>
        refund.status === RefundStatus.REQUESTED ||
        refund.status === RefundStatus.PROCESSING,
    );

    if (existingInFlightRefund) {
      throw new BadRequestException(
        `Order "${orderId}" already has a refund in progress.`,
      );
    }

    const refundedTotal = order.refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce(
        (runningTotal, refund) => runningTotal.add(refund.amount),
        new Prisma.Decimal(0),
      );
    const remainingRefundableAmount = paymentTransaction.grossAmount.sub(refundedTotal);

    if (remainingRefundableAmount.lte(new Prisma.Decimal(0))) {
      throw new BadRequestException(`Order "${orderId}" has no remaining refundable amount.`);
    }

    const requestedAmount = payload.amount
      ? new Prisma.Decimal(payload.amount).toDecimalPlaces(2)
      : remainingRefundableAmount;

    if (requestedAmount.lte(new Prisma.Decimal(0))) {
      throw new BadRequestException("Refund amount must be greater than zero.");
    }

    if (requestedAmount.greaterThan(remainingRefundableAmount)) {
      throw new BadRequestException(
        `Refund amount exceeds remaining refundable amount of ${remainingRefundableAmount.toFixed(2)} ${paymentTransaction.currency}.`,
      );
    }

    const isFullRefund = requestedAmount.equals(remainingRefundableAmount);
    const reverseTransfer = payload.reverseTransfer ?? true;
    const refundApplicationFee =
      payload.refundApplicationFee ?? isFullRefund;

    const draftRefund = await this.prisma.refund.create({
      data: {
        orderId: order.id,
        paymentTransactionId: paymentTransaction.id,
        provider: PaymentProvider.STRIPE,
        status: RefundStatus.REQUESTED,
        amount: requestedAmount,
        currency: paymentTransaction.currency,
        reverseTransfer,
        refundApplicationFee,
        reason: payload.reason ?? null,
        requestedByUserId: user.id,
        metadata: {
          eventId: order.eventId,
          eventSlug: order.event.slug,
          isFullRefund,
          remainingRefundableAmount: remainingRefundableAmount.toFixed(2),
        } as Prisma.InputJsonValue,
      },
    });

    try {
      const stripeRefund = await this.paymentsService.createStripeRefund({
        amount: requestedAmount,
        currency: paymentTransaction.currency,
        paymentTransactionId: paymentTransaction.id,
        providerChargeId: paymentTransaction.providerChargeId,
        providerPaymentIntentId: paymentTransaction.providerPaymentIntentId,
        reason: payload.reason ?? null,
        refundApplicationFee,
        refundId: draftRefund.id,
        reverseTransfer,
      });

      const updatedRefund = await this.prisma.refund.update({
        where: { id: draftRefund.id },
        data: {
          status: stripeRefund.status,
          providerRefundId: stripeRefund.providerRefundId,
          processedAt:
            stripeRefund.status === RefundStatus.SUCCEEDED ? new Date() : null,
          failedAt:
            stripeRefund.status === RefundStatus.FAILED ? new Date() : null,
          failureReason: stripeRefund.failureReason,
        },
      });

      if (stripeRefund.status === RefundStatus.SUCCEEDED) {
        await this.applyImmediateRefundEffects({
          isFullRefund,
          orderId: order.id,
          paymentTransactionId: paymentTransaction.id,
          refundedAt: updatedRefund.processedAt ?? new Date(),
          requestedByUserId: user.id,
        });
      }

      this.logger.log(
        `order.refund.created orderId=${order.id} refundId=${updatedRefund.id} amount=${requestedAmount.toFixed(2)} currency=${paymentTransaction.currency} fullRefund=${isFullRefund}`,
      );

      return toRefundResponse(updatedRefund);
    } catch (error) {
      await this.prisma.refund.update({
        where: { id: draftRefund.id },
        data: {
          status: RefundStatus.FAILED,
          failedAt: new Date(),
          failureReason:
            error instanceof Error ? error.message : "Refund creation failed.",
        },
      });

      throw error;
    }
  }

  private async applyImmediateRefundEffects(input: {
    isFullRefund: boolean;
    orderId: string;
    paymentTransactionId: string;
    refundedAt: Date;
    requestedByUserId: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: input.paymentTransactionId },
        data: {
          settlementState: input.isFullRefund ? "FAILED" : "ON_HOLD",
        },
      });

      await tx.organizerEarning.updateMany({
        where: {
          paymentTransactionId: input.paymentTransactionId,
        },
        data: {
          settlementState: input.isFullRefund ? "FAILED" : "ON_HOLD",
          settledAt: null,
        },
      });

      await tx.order.update({
        where: { id: input.orderId },
        data: {
          status: input.isFullRefund
            ? OrderStatus.REFUNDED
            : OrderStatus.PARTIALLY_REFUNDED,
          refundedAt: input.refundedAt,
        },
      });

      if (!input.isFullRefund) {
        return;
      }

      const tickets = await tx.ticket.findMany({
        where: {
          orderId: input.orderId,
          status: {
            not: TicketStatus.REFUNDED,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      for (const ticket of tickets) {
        const refundedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            refundedAt: input.refundedAt,
            status: TicketStatus.REFUNDED,
            ownershipRevision: ticket.ownershipRevision + 1,
          },
        });

        await this.ticketOwnershipHistoryService.recordRefund(tx, {
          fromUserId: ticket.currentOwnerId,
          refundedAt: input.refundedAt,
          revision: refundedTicket.ownershipRevision,
          ticketId: ticket.id,
          toUserId: ticket.currentOwnerId,
        });
      }
    });
  }
}
