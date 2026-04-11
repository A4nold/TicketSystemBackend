import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CheckoutLineItemDto,
  CreateCheckoutDto,
} from "./dto/create-checkout.dto";
import { toOrderResponse } from "./mappers/order-response.mapper";

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createCheckout(payload: CreateCheckoutDto, user: AuthenticatedUser) {
    if (payload.idempotencyKey) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          userId: user.id,
          idempotencyKey: payload.idempotencyKey,
        },
        include: this.orderInclude(),
      });

      if (existingOrder) {
        return toOrderResponse(existingOrder);
      }
    }

    const event = await this.prisma.event.findUnique({
      where: { slug: payload.eventSlug },
      include: {
        ticketTypes: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(
        `Event with slug "${payload.eventSlug}" was not found.`,
      );
    }

    this.assertEventPurchasable(event);

    const requestedItems = this.normalizeItems(payload.items);
    const ticketTypes = event.ticketTypes.filter((ticketType) =>
      requestedItems.some((item) => item.ticketTypeId === ticketType.id),
    );

    if (ticketTypes.length !== requestedItems.length) {
      throw new BadRequestException(
        "One or more requested ticket types do not belong to this event or are inactive.",
      );
    }

    await this.assertTicketTypeAvailability(ticketTypes, requestedItems);

    const totals = this.calculateOrderTotals(ticketTypes, requestedItems);
    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        eventId: event.id,
        status: OrderStatus.PENDING,
        currency: totals.currency,
        subtotalAmount: totals.subtotal,
        feeAmount: totals.fee,
        totalAmount: totals.total,
        paymentProvider: payload.paymentProvider ?? PaymentProvider.STRIPE,
        checkoutSessionId: this.generateCheckoutSessionId(),
        idempotencyKey: payload.idempotencyKey,
        items: {
          create: requestedItems.map((item) => {
            const ticketType = ticketTypes.find(
              (candidate) => candidate.id === item.ticketTypeId,
            );

            return {
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: ticketType!.price,
              totalPrice: ticketType!.price.mul(item.quantity),
            };
          }),
        },
      },
      include: this.orderInclude(),
    });
    let checkoutSessionId = order.checkoutSessionId;
    let checkoutUrl: string | null = null;
    let paymentStatus: string | null = null;
    let checkoutStatus: string | null = null;
    let isAwaitingPaymentConfirmation = false;

    if (
      order.paymentProvider === PaymentProvider.STRIPE &&
      process.env.STRIPE_SECRET_KEY
    ) {
      const session = await this.paymentsService.createCheckoutSession({
        id: order.id,
        currency: order.currency,
        totalAmount: order.totalAmount,
        userId: order.userId,
        event: {
          title: order.event.title,
          slug: order.event.slug,
        },
        items: order.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ticketType: {
            name: item.ticketType.name,
            description: item.ticketType.description,
            currency: item.ticketType.currency,
          },
        })),
      });

      checkoutSessionId = session.checkoutSessionId;
      checkoutUrl = session.checkoutUrl ?? null;
      paymentStatus = session.paymentStatus ?? null;
      checkoutStatus = session.checkoutStatus ?? null;
      isAwaitingPaymentConfirmation =
        session.isAwaitingPaymentConfirmation ?? true;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          checkoutSessionId,
        },
      });
    }

    return toOrderResponse({
      ...order,
      checkoutSessionId,
      checkoutUrl,
      paymentStatus,
      checkoutStatus,
      isAwaitingPaymentConfirmation,
    });
  }

  private assertEventPurchasable(event: {
    slug: string;
    status: string;
    salesStartAt: Date | null;
    salesEndAt: Date | null;
  }) {
    const now = new Date();

    if (!["PUBLISHED", "LIVE"].includes(event.status)) {
      throw new BadRequestException(
        `Event "${event.slug}" is not currently on sale.`,
      );
    }

    if (event.salesStartAt && now < event.salesStartAt) {
      throw new BadRequestException(
        `Ticket sales have not opened yet for event "${event.slug}".`,
      );
    }

    if (event.salesEndAt && now > event.salesEndAt) {
      throw new BadRequestException(
        `Ticket sales have already closed for event "${event.slug}".`,
      );
    }
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
    requestedItems: CheckoutLineItemDto[],
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

  private normalizeItems(items: CheckoutLineItemDto[]) {
    const mergedItems = new Map<string, number>();

    for (const item of items) {
      mergedItems.set(
        item.ticketTypeId,
        (mergedItems.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }

    return Array.from(mergedItems.entries()).map(([ticketTypeId, quantity]) => ({
      ticketTypeId,
      quantity,
    }));
  }

  private calculateOrderTotals(
    ticketTypes: Array<{
      id: string;
      price: Prisma.Decimal;
      currency: string;
    }>,
    requestedItems: CheckoutLineItemDto[],
  ) {
    const subtotal = requestedItems.reduce((runningTotal, item) => {
      const ticketType = ticketTypes.find(
        (candidate) => candidate.id === item.ticketTypeId,
      )!;

      return runningTotal.add(ticketType.price.mul(item.quantity));
    }, new Prisma.Decimal(0));

    const fee = subtotal.mul(new Prisma.Decimal("0.10")).toDecimalPlaces(2);
    const total = subtotal.add(fee);
    const currencies = new Set(ticketTypes.map((ticketType) => ticketType.currency));

    if (currencies.size !== 1) {
      throw new BadRequestException(
        "Checkout currently supports a single currency per order.",
      );
    }

    return {
      subtotal,
      fee,
      total,
      currency: ticketTypes[0]!.currency,
    };
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

  private generateCheckoutSessionId() {
    return `chk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
