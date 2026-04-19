import {
  BadRequestException,
  Injectable,
  Logger,
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
import { calculateFeeTotals, resolveFeePolicy, type FeePolicy } from "./fee-policy";
import { toOrderResponse } from "./mappers/order-response.mapper";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createCheckout(payload: CreateCheckoutDto, user: AuthenticatedUser) {
    this.logger.log(
      `checkout.create.started userId=${user.id} eventSlug=${payload.eventSlug} items=${payload.items.length} provider=${payload.paymentProvider ?? PaymentProvider.STRIPE} idempotencyKey=${payload.idempotencyKey ?? "none"}`,
    );

    if (payload.idempotencyKey) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          userId: user.id,
          idempotencyKey: payload.idempotencyKey,
        },
        include: this.orderInclude(),
      });

      if (existingOrder) {
        this.logger.log(
          `checkout.create.reused orderId=${existingOrder.id} userId=${user.id} eventId=${existingOrder.eventId} idempotencyKey=${payload.idempotencyKey}`,
        );
        return toOrderResponse(existingOrder);
      }
    }

    let quote: Awaited<ReturnType<typeof this.prepareCheckoutQuote>>;

    try {
      quote = await this.prepareCheckoutQuote(payload);
    } catch (error) {
      this.logger.warn(
        `checkout.quote.failed userId=${user.id} eventSlug=${payload.eventSlug} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    const { event, feePolicy, requestedItems, ticketTypes, totals } = quote;
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
    this.logger.log(
      `checkout.create.order_created orderId=${order.id} userId=${user.id} eventId=${event.id} subtotal=${totals.subtotal.toFixed(2)} fee=${totals.fee.toFixed(2)} total=${totals.total.toFixed(2)} currency=${totals.currency}`,
    );
    let checkoutSessionId = order.checkoutSessionId;
    let checkoutUrl: string | null = null;
    let paymentStatus: string | null = null;
    let checkoutStatus: string | null = null;
    let isAwaitingPaymentConfirmation = false;

    if (
      order.paymentProvider === PaymentProvider.STRIPE &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        const session = await this.paymentsService.createCheckoutSession({
          cancelReturnUrl: payload.cancelReturnUrl,
          feeAmount: order.feeAmount,
          feePolicy,
          id: order.id,
          currency: order.currency,
          totalAmount: order.totalAmount,
          userId: order.userId,
          successReturnUrl: payload.successReturnUrl,
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

        this.logger.log(
          `checkout.create.session_created orderId=${order.id} checkoutSessionId=${checkoutSessionId} paymentStatus=${paymentStatus ?? "unknown"} checkoutStatus=${checkoutStatus ?? "unknown"} awaitingConfirmation=${isAwaitingPaymentConfirmation}`,
        );
      } catch (error) {
        this.logger.error(
          `checkout.create.session_failed orderId=${order.id} userId=${user.id} provider=${order.paymentProvider} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
        );
        throw error;
      }
    }

    return toOrderResponse({
      ...order,
      checkoutSessionId,
      checkoutUrl,
      feePolicy,
      paymentStatus,
      checkoutStatus,
      isAwaitingPaymentConfirmation,
    });
  }

  async quoteCheckout(payload: CreateCheckoutDto) {
    try {
      const quote = await this.prepareCheckoutQuote(payload);

      this.logger.log(
        `checkout.quote.completed eventSlug=${payload.eventSlug} items=${quote.requestedItems.length} total=${quote.totals.total.toFixed(2)} currency=${quote.totals.currency}`,
      );

      return {
        currency: quote.totals.currency,
        event: {
          id: quote.event.id,
          slug: quote.event.slug,
          startsAt: quote.event.startsAt,
          title: quote.event.title,
        },
        feeAmount: quote.totals.fee.toFixed(2),
        feePolicy: {
          displayName: quote.feePolicy.displayName,
          model: quote.feePolicy.model,
          responsibility: quote.feePolicy.responsibility,
          percentRate: quote.feePolicy.percentRate.toString(),
          fixedAmount: quote.feePolicy.fixedAmount.toFixed(2),
          fixedFeeApplication: quote.feePolicy.fixedFeeApplication,
        },
        items: quote.requestedItems.map((item) => {
          const ticketType = quote.ticketTypes.find((candidate) => candidate.id === item.ticketTypeId)!;

          return {
            currency: ticketType.currency,
            quantity: item.quantity,
            ticketTypeId: ticketType.id,
            ticketTypeName: ticketType.name,
            totalPrice: ticketType.price.mul(item.quantity).toFixed(2),
            unitPrice: ticketType.price.toFixed(2),
          };
        }),
        subtotalAmount: quote.totals.subtotal.toFixed(2),
        totalAmount: quote.totals.total.toFixed(2),
      };
    } catch (error) {
      this.logger.warn(
        `checkout.quote.failed eventSlug=${payload.eventSlug} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }
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
    feePolicy: FeePolicy,
  ) {
    const subtotal = requestedItems.reduce((runningTotal, item) => {
      const ticketType = ticketTypes.find(
        (candidate) => candidate.id === item.ticketTypeId,
      )!;

      return runningTotal.add(ticketType.price.mul(item.quantity));
    }, new Prisma.Decimal(0));

    const currencies = new Set(ticketTypes.map((ticketType) => ticketType.currency));

    if (currencies.size !== 1) {
      throw new BadRequestException(
        "Checkout currently supports a single currency per order.",
      );
    }

    const itemCount = requestedItems.reduce((runningTotal, item) => runningTotal + item.quantity, 0);
    const appliedFees = calculateFeeTotals({
      currency: ticketTypes[0]!.currency,
      itemCount,
      policy: feePolicy,
      subtotal,
    });

    return {
      subtotal,
      fee: appliedFees.platformFee,
      total: appliedFees.total,
      currency: appliedFees.currency,
      organizerFee: appliedFees.organizerFee,
    };
  }

  private async prepareCheckoutQuote(payload: CreateCheckoutDto) {
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

    const feePolicy = resolveFeePolicy();
    const totals = this.calculateOrderTotals(ticketTypes, requestedItems, feePolicy);

    return {
      event,
      feePolicy,
      requestedItems,
      ticketTypes,
      totals,
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
