import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OrderStatus,
  OwnershipChangeType,
  PaymentProvider,
  Prisma,
  TicketStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import {
  CheckoutLineItemDto,
  CreateCheckoutDto,
} from "./dto/create-checkout.dto";

@Injectable()
export class OrdersService {
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

    return orders.map((order) => this.toOrderResponse(order));
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

    return this.toOrderResponse(refreshedOrder ?? order, checkoutState);
  }

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
        return this.toOrderResponse(existingOrder);
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

    return this.toOrderResponse({
      ...order,
      checkoutSessionId,
      checkoutUrl,
      paymentStatus,
      checkoutStatus,
      isAwaitingPaymentConfirmation,
    });
  }

  async confirmPayment(
    orderId: string,
    payload: ConfirmPaymentDto,
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

    if (order.status === OrderStatus.PAID) {
      return this.toOrderResponse(order);
    }

    if (order.status !== OrderStatus.PENDING) {
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
    const paidOrder = await this.prisma.$transaction(async (tx) => {
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

      if (updatedOrder.tickets.length === 0) {
        const eventCode = this.toEventCode(updatedOrder.event.slug);

        for (const item of updatedOrder.items) {
          const existingCount = await tx.ticket.count({
            where: {
              eventId: updatedOrder.eventId,
              ticketTypeId: item.ticketTypeId,
            },
          });

          for (let index = 0; index < item.quantity; index += 1) {
            const serialNumber = this.generateSerialNumber(
              eventCode,
              item.ticketType.name,
              existingCount + index + 1,
            );

            const ticket = await tx.ticket.create({
              data: {
                eventId: updatedOrder.eventId,
                ticketTypeId: item.ticketTypeId,
                orderId: updatedOrder.id,
                currentOwnerId: updatedOrder.userId,
                status: TicketStatus.ISSUED,
                serialNumber,
                qrTokenId: this.generateQrTokenId(serialNumber),
                ownershipRevision: 1,
                issuedAt: paidAt,
              },
            });

            await tx.ticketOwnershipHistory.create({
              data: {
                ticketId: ticket.id,
                fromUserId: null,
                toUserId: updatedOrder.userId,
                changeType: OwnershipChangeType.PURCHASE,
                revision: 1,
                metadata: {
                  orderId: updatedOrder.id,
                  orderItemId: item.id,
                  serialNumber,
                },
              },
            });
          }
        }
      }

      return tx.order.findUniqueOrThrow({
        where: { id: updatedOrder.id },
        include: this.orderInclude(),
      });
    });

    return this.toOrderResponse(paidOrder);
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
      return this.toOrderResponse(order);
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

    return this.toOrderResponse(cancelledOrder);
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

  private async reconcileOrderCheckoutState(order: {
    id: string;
    status: OrderStatus;
    paymentProvider: PaymentProvider;
    checkoutSessionId: string | null;
  }) {
    try {
      return await this.paymentsService.reconcilePendingOrderWithStripe(order);
    } catch {
      return null;
    }
  }

  private toOrderResponse(order: {
    id: string;
    status: OrderStatus;
    currency: string;
    subtotalAmount: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    paymentProvider: PaymentProvider;
    paymentReference: string | null;
    checkoutSessionId: string | null;
    checkoutUrl?: string | null;
    paymentStatus?: string | null;
    checkoutStatus?: string | null;
    isAwaitingPaymentConfirmation?: boolean;
    idempotencyKey: string | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    event: {
      id: string;
      slug: string;
      title: string;
      startsAt: Date;
    };
    items: Array<{
      ticketTypeId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      ticketType: {
        name: string;
        currency: string;
      };
    }>;
    tickets: Array<{
      id: string;
      serialNumber: string;
      status: TicketStatus;
      qrTokenId: string;
      ownershipRevision: number;
      issuedAt: Date | null;
    }>;
  },
  checkoutState?: {
    checkoutSessionId: string;
    checkoutUrl: string | null;
    paymentStatus: string | null;
    checkoutStatus: string | null;
    isAwaitingPaymentConfirmation: boolean;
  } | null) {
    const paymentStatus = checkoutState?.paymentStatus ?? order.paymentStatus ?? null;
    const checkoutStatus =
      checkoutState?.checkoutStatus ?? order.checkoutStatus ?? null;
    const checkoutUrl = checkoutState?.checkoutUrl ?? order.checkoutUrl ?? null;
    const checkoutSessionId =
      checkoutState?.checkoutSessionId ?? order.checkoutSessionId;
    const isAwaitingPaymentConfirmation =
      checkoutState?.isAwaitingPaymentConfirmation ??
      order.isAwaitingPaymentConfirmation ??
      (order.status === OrderStatus.PENDING &&
        order.paymentProvider === PaymentProvider.STRIPE &&
        Boolean(order.checkoutSessionId) &&
        paymentStatus !== "paid" &&
        checkoutStatus !== "expired");

    return {
      id: order.id,
      status: order.status,
      currency: order.currency,
      subtotalAmount: order.subtotalAmount.toFixed(2),
      feeAmount: order.feeAmount.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
      paymentProvider: order.paymentProvider,
      paymentReference: order.paymentReference,
      checkoutSessionId,
      checkoutUrl,
      paymentStatus,
      checkoutStatus,
      isAwaitingPaymentConfirmation,
      idempotencyKey: order.idempotencyKey,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      event: {
        id: order.event.id,
        slug: order.event.slug,
        title: order.event.title,
        startsAt: order.event.startsAt,
      },
      items: order.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: item.totalPrice.toFixed(2),
        currency: item.ticketType.currency,
      })),
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        serialNumber: ticket.serialNumber,
        status: ticket.status,
        qrTokenId: ticket.qrTokenId,
        ownershipRevision: ticket.ownershipRevision,
        issuedAt: ticket.issuedAt,
      })),
    };
  }

  private toEventCode(slug: string) {
    return slug
      .split("-")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3)
      .padEnd(3, "X");
  }

  private toTicketTypeCode(name: string) {
    const normalized = name.toUpperCase();

    if (normalized.includes("VIP")) {
      return "VIP";
    }

    if (normalized.includes("GENERAL")) {
      return "GA";
    }

    return normalized
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3)
      .padEnd(2, "X");
  }

  private generateSerialNumber(
    eventCode: string,
    ticketTypeName: string,
    sequence: number,
  ) {
    return `${eventCode}-${this.toTicketTypeCode(ticketTypeName)}-${String(sequence).padStart(4, "0")}`;
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
  }

  private generateCheckoutSessionId() {
    return `chk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  private generatePaymentReference() {
    return `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
