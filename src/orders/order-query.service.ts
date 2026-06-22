import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentProvider } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { toOrderResponse } from "./mappers/order-response.mapper";

@Injectable()
export class OrderQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async listMyOrders(user: AuthenticatedUser) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: this.orderInclude(),
    });

    return orders.map((order) => toOrderResponse(order));
  }

  async getOrder(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" was not found.`);
    }

    const checkoutState = await this.reconcileOrderCheckoutState(order);

    const refreshedOrder = checkoutState
      ? await this.prisma.order.findFirst({
          where: {
            id: orderId,
            userId: user.id,
          },
          include: this.orderInclude(),
        })
      : order;

    return toOrderResponse(refreshedOrder ?? order, checkoutState);
  }

  async getOrderByCheckoutSessionId(checkoutSessionId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        checkoutSessionId,
        userId: user.id,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException(
        `Order with checkout session "${checkoutSessionId}" was not found.`,
      );
    }

    const checkoutState = await this.reconcileOrderCheckoutState(order);

    const refreshedOrder = checkoutState
      ? await this.prisma.order.findFirst({
          where: {
            id: order.id,
            userId: user.id,
          },
          include: this.orderInclude(),
        })
      : order;

    return toOrderResponse(refreshedOrder ?? order, checkoutState);
  }

  async getOrderByPaymentIntentId(paymentIntentId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId: user.id,
        paymentTransactions: {
          some: {
            providerPaymentIntentId: paymentIntentId,
          },
        },
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException(
        `Order with payment intent "${paymentIntentId}" was not found.`,
      );
    }

    const checkoutState = await this.reconcileOrderCheckoutState(order);

    const refreshedOrder = checkoutState
      ? await this.prisma.order.findFirst({
          where: {
            id: order.id,
            userId: user.id,
          },
          include: this.orderInclude(),
        })
      : order;

    return toOrderResponse(refreshedOrder ?? order, checkoutState);
  }

  private orderInclude() {
    return {
      event: true,
      items: {
        include: {
          ticketType: true,
        },
        orderBy: {
          createdAt: "asc" as const,
        },
      },
      tickets: {
        orderBy: {
          createdAt: "asc" as const,
        },
      },
      paymentTransactions: {
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 1,
      },
    };
  }

  private async reconcileOrderCheckoutState(order: {
    id: string;
    status: OrderStatus;
    paymentProvider: PaymentProvider;
    checkoutSessionId: string | null;
  }) {
    try {
      return await this.paymentsService.reconcilePendingOrderWithProvider(order);
    } catch {
      return null;
    }
  }
}
