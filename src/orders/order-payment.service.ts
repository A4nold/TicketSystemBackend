import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { toOrderResponse } from "./mappers/order-response.mapper";
import { PurchasedTicketIssuanceService } from "./purchased-ticket-issuance.service";

@Injectable()
export class OrderPaymentService {
  private readonly logger = new Logger(OrderPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly purchasedTicketIssuanceService: PurchasedTicketIssuanceService,
  ) {}

  async confirmPayment(
    orderId: string,
    payload: ConfirmPaymentDto,
    user: AuthenticatedUser,
  ) {
    this.logger.log(
      `order.confirm_payment.started orderId=${orderId} userId=${user.id} checkoutSessionId=${payload.checkoutSessionId ?? "none"}`,
    );
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      this.logger.warn(`order.confirm_payment.not_found orderId=${orderId} userId=${user.id}`);
      throw new NotFoundException(`Order "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.log(`order.confirm_payment.already_paid orderId=${order.id} userId=${user.id}`);
      return toOrderResponse(order);
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(
        `order.confirm_payment.invalid_state orderId=${order.id} userId=${user.id} status=${order.status}`,
      );
      throw new BadRequestException(
        `Order "${orderId}" is in "${order.status}" state and cannot be paid.`,
      );
    }

    await this.assertTicketTypeAvailability(
      order.items.map((item) => item.ticketType),
      order.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      })),
      order.id,
    );

    const paidAt = new Date();
    let paidOrder: typeof order;

    try {
      paidOrder = await this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentReference:
              payload.paymentReference ?? this.generatePaymentReference(),
            checkoutSessionId:
              payload.checkoutSessionId ?? order.checkoutSessionId,
            paidAt,
          },
          include: this.orderInclude(),
        });

        await this.purchasedTicketIssuanceService.issuePurchasedTickets(
          tx,
          updatedOrder,
          paidAt,
        );

        return tx.order.findUniqueOrThrow({
          where: { id: updatedOrder.id },
          include: this.orderInclude(),
        });
      });
    } catch (error) {
      this.logger.error(
        `order.confirm_payment.failed orderId=${order.id} userId=${user.id} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    await this.notificationsService.notifyOrderPaid({
      eventTitle: paidOrder.event.title,
      orderId: paidOrder.id,
      ticketCount: paidOrder.tickets.length,
      userId: paidOrder.userId,
    });

    this.logger.log(
      `order.confirm_payment.completed orderId=${paidOrder.id} userId=${user.id} tickets=${paidOrder.tickets.length} paymentReference=${paidOrder.paymentReference ?? "none"}`,
    );

    return toOrderResponse(paidOrder);
  }

  private async assertTicketTypeAvailability(
    ticketTypes: Array<{
      id: string;
      name: string;
      quantity: number;
      maxPerOrder: number | null;
      price: Prisma.Decimal;
      currency: string;
      saleStartsAt: Date | null;
      saleEndsAt: Date | null;
    }>,
    requestedItems: Array<{
      ticketTypeId: string;
      quantity: number;
    }>,
    excludeOrderId?: string,
  ) {
    const now = new Date();

    for (const item of requestedItems) {
      const ticketType = ticketTypes.find(
        (candidate) => candidate.id === item.ticketTypeId,
      );

      if (!ticketType) {
        throw new BadRequestException(
          `Ticket type "${item.ticketTypeId}" was not found.`,
        );
      }

      if (ticketType.maxPerOrder && item.quantity > ticketType.maxPerOrder) {
        throw new BadRequestException(
          `Ticket type "${ticketType.name}" allows a maximum of ${ticketType.maxPerOrder} per order.`,
        );
      }

      if (ticketType.saleStartsAt && now < ticketType.saleStartsAt) {
        throw new BadRequestException(
          `Ticket type "${ticketType.name}" is not yet on sale.`,
        );
      }

      if (ticketType.saleEndsAt && now > ticketType.saleEndsAt) {
        throw new BadRequestException(
          `Ticket type "${ticketType.name}" is no longer on sale.`,
        );
      }
    }

    const reservedQuantities = await this.prisma.orderItem.groupBy({
      by: ["ticketTypeId"],
      where: {
        ticketTypeId: {
          in: ticketTypes.map((ticketType) => ticketType.id),
        },
        ...(excludeOrderId
          ? {
              orderId: {
                not: excludeOrderId,
              },
            }
          : {}),
        order: {
          status: {
            in: [OrderStatus.PENDING, OrderStatus.PAID],
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    for (const item of requestedItems) {
      const ticketType = ticketTypes.find(
        (candidate) => candidate.id === item.ticketTypeId,
      )!;
      const alreadyReserved =
        reservedQuantities.find(
          (reserved) => reserved.ticketTypeId === item.ticketTypeId,
        )?._sum.quantity ?? 0;

      if (alreadyReserved + item.quantity > ticketType.quantity) {
        throw new BadRequestException(
          `Only ${Math.max(ticketType.quantity - alreadyReserved, 0)} tickets remain for "${ticketType.name}".`,
        );
      }
    }
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

  private generatePaymentReference() {
    return `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
