import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { isOfferRangePricingEnabled } from "../common/feature-flags";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CheckoutLineItemDto,
  CreateCheckoutDto,
} from "./dto/create-checkout.dto";
import { calculateFeeTotals, resolveFeePolicy, type FeePolicy } from "./fee-policy";
import { toOrderResponse } from "./mappers/order-response.mapper";
import { PurchasedTicketIssuanceService } from "./purchased-ticket-issuance.service";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly purchasedTicketIssuanceService: PurchasedTicketIssuanceService,
    private readonly notificationsService: NotificationsService,
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
      quote = await this.prepareCheckoutQuote(payload, user);
    } catch (error) {
      this.logger.warn(
        `checkout.quote.failed userId=${user.id} eventSlug=${payload.eventSlug} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    const { event, feePolicy, requestedItems, pricedItems, totals } = quote;
    const paymentProvider =
      payload.paymentProvider ?? this.resolveDefaultPaymentProvider(totals.currency);
    if (payload.offerIntentId) {
      const consumed = await (this.prisma as any).ticketOfferRequest.updateMany({
        where: {
          checkoutUnlockToken: payload.offerIntentId,
          status: "ACCEPTED",
          attendeeUserId: user.id,
        },
        data: {
          checkoutUnlockToken: null,
        },
      });

      if (consumed.count === 0) {
        throw new BadRequestException("Offer intent is invalid or has already been used.");
      }
    } else if (payload.offerRequestId && payload.offerUnlockToken) {
      const consumed = await (this.prisma as any).ticketOfferRequest.updateMany({
        where: {
          id: payload.offerRequestId,
          checkoutUnlockToken: payload.offerUnlockToken,
          status: "ACCEPTED",
          attendeeUserId: user.id,
        },
        data: {
          checkoutUnlockToken: null,
        },
      });

      if (consumed.count === 0) {
        throw new BadRequestException("Offer unlock token has already been used.");
      }
    }

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        eventId: event.id,
        status: OrderStatus.PENDING,
        currency: totals.currency,
        subtotalAmount: totals.subtotal,
        feeAmount: totals.fee,
        totalAmount: totals.total,
        paymentProvider,
        checkoutSessionId: this.generateCheckoutSessionId(),
        idempotencyKey: payload.idempotencyKey,
        items: {
          create: requestedItems.map((item) => {
            const pricedItem = pricedItems.find(
              (candidate) => candidate.id === item.ticketTypeId,
            );

            return {
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPrice: pricedItem!.unitPrice,
              totalPrice: pricedItem!.unitPrice.mul(item.quantity),
            };
          }),
        },
      },
      include: this.orderInclude(),
    });

    this.logger.log(
      `checkout.create.order_created orderId=${order.id} userId=${user.id} eventId=${event.id} subtotal=${totals.subtotal.toFixed(2)} fee=${totals.fee.toFixed(2)} total=${totals.total.toFixed(2)} currency=${totals.currency}`,
    );

    if (totals.total.lte(new Prisma.Decimal(0))) {
      const paidAt = new Date();
      const paidOrder = await this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paidAt,
            paymentReference: `free:${order.id}`,
            checkoutSessionId: null,
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

      await this.notificationsService.notifyOrderPaid({
        eventTitle: paidOrder.event.title,
        orderId: paidOrder.id,
        ticketCount: paidOrder.tickets.length,
        userId: paidOrder.userId,
      });

      return toOrderResponse({
        ...paidOrder,
        checkoutSessionId: null,
        checkoutStatus: "success",
        checkoutUrl: null,
        feePolicy,
        isAwaitingPaymentConfirmation: false,
        paymentStatus: "paid",
      });
    }
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
          userEmail: user.email,
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

    if (
      order.paymentProvider === PaymentProvider.PAYSTACK &&
      process.env.PAYSTACK_SECRET_KEY
    ) {
      try {
        const session = await this.paymentsService.createPaystackCheckoutTransaction({
          cancelReturnUrl: payload.cancelReturnUrl,
          feeAmount: order.feeAmount,
          feePolicy,
          id: order.id,
          currency: order.currency,
          totalAmount: order.totalAmount,
          userEmail: user.email,
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

  async quoteCheckout(payload: CreateCheckoutDto, user?: AuthenticatedUser) {
    try {
      const quote = await this.prepareCheckoutQuote(payload, user);

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
          const pricedItem = quote.pricedItems.find((candidate) => candidate.id === item.ticketTypeId)!;

          return {
            currency: pricedItem.currency,
            quantity: item.quantity,
            ticketTypeId: pricedItem.id,
            ticketTypeName: pricedItem.name,
            totalPrice: pricedItem.unitPrice.mul(item.quantity).toFixed(2),
            unitPrice: pricedItem.unitPrice.toFixed(2),
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
    pricedItems: Array<{
      id: string;
      unitPrice: Prisma.Decimal;
      currency: string;
    }>,
    requestedItems: CheckoutLineItemDto[],
    feePolicy: FeePolicy,
  ) {
    const subtotal = requestedItems.reduce((runningTotal, item) => {
      const pricedItem = pricedItems.find(
        (candidate) => candidate.id === item.ticketTypeId,
      )!;

      return runningTotal.add(pricedItem.unitPrice.mul(item.quantity));
    }, new Prisma.Decimal(0));

    const currencies = new Set(pricedItems.map((item) => item.currency));

    if (currencies.size !== 1) {
      throw new BadRequestException(
        "Checkout currently supports a single currency per order.",
      );
    }

    if (subtotal.lte(new Prisma.Decimal(0))) {
      return {
        subtotal: new Prisma.Decimal(0),
        fee: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        currency: pricedItems[0]!.currency,
        organizerFee: new Prisma.Decimal(0),
      };
    }

    const itemCount = requestedItems.reduce((runningTotal, item) => runningTotal + item.quantity, 0);
    const appliedFees = calculateFeeTotals({
      currency: pricedItems[0]!.currency,
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

  private async prepareCheckoutQuote(
    payload: CreateCheckoutDto,
    user?: AuthenticatedUser,
  ) {
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

    const pricedItems = await this.resolvePricedItems(
      payload,
      event.id,
      ticketTypes,
      requestedItems,
      user,
    );

    const feePolicy = resolveFeePolicy();
    const totals = this.calculateOrderTotals(pricedItems, requestedItems, feePolicy);

    return {
      event,
      feePolicy,
      pricedItems,
      requestedItems,
      ticketTypes,
      totals,
    };
  }

  private async resolvePricedItems(
    payload: CreateCheckoutDto,
    eventId: string,
    ticketTypes: Array<{
      id: string;
      name: string;
      price: Prisma.Decimal;
      pricingMode?: "FIXED" | "FREE" | "OFFER_RANGE";
      currency: string;
    }>,
    requestedItems: CheckoutLineItemDto[],
    user?: AuthenticatedUser,
  ) {
    const now = new Date();
    const offerRangeTypes = ticketTypes.filter(
      (ticketType) => ticketType.pricingMode === "OFFER_RANGE",
    );

    const pricedItems = ticketTypes.map((ticketType) => ({
      ...ticketType,
      unitPrice:
        ticketType.pricingMode === "FREE"
          ? new Prisma.Decimal(0)
          : ticketType.price,
    }));

    if (offerRangeTypes.length === 0) {
      return pricedItems;
    }

    if (!isOfferRangePricingEnabled()) {
      throw new BadRequestException(
        "Offer-range pricing is currently disabled in this environment.",
      );
    }

    if (!user) {
      throw new BadRequestException(
        "Authenticated user context is required for offer-range checkout.",
      );
    }

    if (offerRangeTypes.length > 1 || requestedItems.length > 1) {
      throw new BadRequestException(
        "Offer-range checkout currently supports a single ticket type per order.",
      );
    }

    const requestedItem = requestedItems[0]!;
    const offerRequest = payload.offerIntentId
      ? await (this.prisma as any).ticketOfferRequest.findFirst({
          where: {
            checkoutUnlockToken: payload.offerIntentId,
            status: "ACCEPTED",
            attendeeUserId: user.id,
          },
        })
      : payload.offerRequestId && payload.offerUnlockToken
        ? await (this.prisma as any).ticketOfferRequest.findUnique({
            where: { id: payload.offerRequestId },
          })
        : null;

    if (!payload.offerIntentId && !(payload.offerRequestId && payload.offerUnlockToken)) {
      throw new BadRequestException(
        "offerIntentId is required for offer-range checkout.",
      );
    }

    if (!offerRequest) {
      throw new BadRequestException("Offer intent was not found.");
    }

    if (
      !payload.offerIntentId &&
      offerRequest.checkoutUnlockToken !== payload.offerUnlockToken
    ) {
      throw new BadRequestException("Offer unlock token is invalid.");
    }

    if (offerRequest.status !== "ACCEPTED") {
      throw new BadRequestException("Offer request is not accepted.");
    }

    if (offerRequest.attendeeUserId !== user.id) {
      throw new BadRequestException(
        "Offer request does not belong to the authenticated user.",
      );
    }

    if (
      offerRequest.eventId !== eventId ||
      offerRequest.ticketTypeId !== requestedItem.ticketTypeId
    ) {
      throw new BadRequestException(
        "Offer request does not match the requested event/ticket type.",
      );
    }

    if (offerRequest.expiresAt <= now) {
      throw new BadRequestException("Offer request has expired.");
    }

    const pricedItem = pricedItems.find(
      (item) => item.id === offerRequest.ticketTypeId,
    )!;
    pricedItem.unitPrice = offerRequest.offeredPrice;
    this.logger.log(
      `checkout.offer.applied offerRequestId=${offerRequest.id} eventId=${eventId} ticketTypeId=${offerRequest.ticketTypeId} attendeeUserId=${user.id} offeredPrice=${offerRequest.offeredPrice.toFixed(2)} currency=${offerRequest.currency}`,
    );

    return pricedItems;
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

  private resolveDefaultPaymentProvider(currency: string) {
    return currency.toUpperCase() === "NGN"
      ? PaymentProvider.PAYSTACK
      : PaymentProvider.STRIPE;
  }
}
