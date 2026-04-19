import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { CheckoutService } from "./checkout.service";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { toOrderResponse } from "./mappers/order-response.mapper";
import { OrderPaymentService } from "./order-payment.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
    private readonly orderPaymentService: OrderPaymentService,
  ) {}

  async createCheckout(payload: CreateCheckoutDto, user: AuthenticatedUser) {
    return this.checkoutService.createCheckout(payload, user);
  }

  async quoteCheckout(payload: CreateCheckoutDto) {
    return this.checkoutService.quoteCheckout(payload);
  }

  async confirmPayment(
    orderId: string,
    payload: ConfirmPaymentDto,
    user: AuthenticatedUser,
  ) {
    return this.orderPaymentService.confirmPayment(orderId, payload, user);
  }

  async cancelOrder(
    orderId: string,
    payload: CancelOrderDto,
    user: AuthenticatedUser,
  ) {
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

    if (order.status === OrderStatus.CANCELLED) {
      return toOrderResponse(order);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order "${orderId}" is in "${order.status}" state and cannot be cancelled.`,
      );
    }

    const cancelledOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        paymentReference:
          payload.reason && !order.paymentReference
            ? `cancelled:${payload.reason}`
            : order.paymentReference,
      },
      include: this.orderInclude(),
    });

    return toOrderResponse(cancelledOrder);
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
    };
  }
}
