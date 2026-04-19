import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma } from "@prisma/client";
import Stripe from "stripe";

import { NotificationsService } from "../notifications/notifications.service";
import { type FeePolicy } from "../orders/fee-policy";
import { PrismaService } from "../prisma/prisma.service";

type CheckoutOrder = {
  cancelReturnUrl?: string;
  feeAmount: Prisma.Decimal;
  feePolicy: FeePolicy;
  id: string;
  currency: string;
  totalAmount: Prisma.Decimal;
  successReturnUrl?: string;
  userId: string;
  event: {
    title: string;
    slug: string;
  };
  items: Array<{
    quantity: number;
    ticketType: {
      name: string;
      description: string | null;
      currency: string;
    };
    unitPrice: Prisma.Decimal;
  }>;
};

type StripeCheckoutState = {
  checkoutSessionId: string;
  checkoutUrl: string | null;
  paymentStatus: string | null;
  checkoutStatus: string | null;
  isAwaitingPaymentConfirmation: boolean;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createCheckoutSession(order: CheckoutOrder) {
    this.logger.log(
      `payments.stripe.checkout_session.started orderId=${order.id} userId=${order.userId} total=${order.totalAmount.toFixed(2)} currency=${order.currency}`,
    );
    const stripe = this.getStripeClient();
    const frontendUrl = process.env.FRONTEND_APP_URL;

    if (!frontendUrl && (!order.successReturnUrl || !order.cancelReturnUrl)) {
      throw new NotImplementedException(
        "FRONTEND_APP_URL must be configured to create Stripe checkout sessions unless explicit mobile return URLs are provided.",
      );
    }

    const successUrl = this.buildCheckoutReturnUrl({
      fallbackBaseUrl: `${frontendUrl?.replace(/\/$/, "") ?? ""}/checkout/success`,
      orderId: order.id,
      providedUrl: order.successReturnUrl,
      sessionPlaceholder: true,
    });
    const cancelUrl = this.buildCheckoutReturnUrl({
      fallbackBaseUrl: `${frontendUrl?.replace(/\/$/, "") ?? ""}/checkout/cancel`,
      orderId: order.id,
      providedUrl: order.cancelReturnUrl,
      sessionPlaceholder: false,
    });
    const lineItems = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.ticketType.currency.toLowerCase(),
        product_data: {
          name: `${order.event.title} · ${item.ticketType.name}`,
          description: item.ticketType.description ?? undefined,
        },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
    }));

    if (
      order.feePolicy.responsibility === "BUYER" &&
      order.feeAmount.greaterThan(new Prisma.Decimal(0))
    ) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: order.feePolicy.displayName,
            description: this.describeFeePolicy(order.feePolicy),
          },
          unit_amount: Math.round(Number(order.feeAmount) * 100),
        },
      });
    }

    let session: any;

    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_creation: "if_required",
        client_reference_id: order.id,
        line_items: lineItems,
        metadata: {
          orderId: order.id,
          eventSlug: order.event.slug,
          userId: order.userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `payments.stripe.checkout_session.failed orderId=${order.id} userId=${order.userId} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    this.logger.log(
      `payments.stripe.checkout_session.completed orderId=${order.id} checkoutSessionId=${session.id} paymentStatus=${session.payment_status ?? "unknown"} checkoutStatus=${session.status ?? "unknown"}`,
    );

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentStatus: session.payment_status,
      checkoutStatus: session.status,
      isAwaitingPaymentConfirmation:
        session.payment_status !== "paid" && session.status !== "expired",
    };
  }

  private describeFeePolicy(policy: FeePolicy) {
    const percentLabel = policy.percentRate.mul(100).toDecimalPlaces(2).toString();
    const fixedLabel = policy.fixedAmount.toDecimalPlaces(2).toString();
    const fixedScopeLabel =
      policy.fixedFeeApplication === "PER_TICKET" ? "per ticket" : "per order";

    return `${percentLabel}% + ${fixedLabel} ${fixedScopeLabel}`;
  }

  private buildCheckoutReturnUrl({
    fallbackBaseUrl,
    orderId,
    providedUrl,
    sessionPlaceholder,
  }: {
    fallbackBaseUrl: string;
    orderId: string;
    providedUrl?: string;
    sessionPlaceholder: boolean;
  }) {
    const baseUrl = providedUrl?.trim() || fallbackBaseUrl;

    if (!baseUrl) {
      throw new NotImplementedException("A valid checkout return URL could not be resolved.");
    }

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("orderId", orderId);

      if (sessionPlaceholder) {
        url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
      }

      return url.toString();
    } catch {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const sessionSuffix = sessionPlaceholder
        ? `&session_id=${encodeURIComponent("{CHECKOUT_SESSION_ID}")}`
        : "";

      return `${baseUrl}${separator}orderId=${encodeURIComponent(orderId)}${sessionSuffix}`;
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new NotImplementedException(
        "STRIPE_WEBHOOK_SECRET must be configured to process Stripe webhooks.",
      );
    }

    let event: any;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.warn(
        `payments.stripe.webhook.invalid_signature reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw new BadRequestException("Invalid Stripe webhook signature.");
    }

    this.logger.log(
      `payments.stripe.webhook.received eventId=${event.id} type=${event.type}`,
    );

    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        providerEventId: event.id,
      },
    });

    if (existing?.processedAt) {
      this.logger.log(
        `payments.stripe.webhook.duplicate eventId=${event.id} type=${event.type}`,
      );
      return { received: true, duplicate: true };
    }

    const relatedEventId = await this.resolveRelatedEventId(event);

    await this.prisma.webhookEvent.upsert({
      where: {
        providerEventId: event.id,
      },
      create: {
        eventId: relatedEventId,
        provider: PaymentProvider.STRIPE,
        providerEventId: event.id,
        eventType: event.type,
        payload: event as unknown as Prisma.InputJsonValue,
        processedAt: null,
      },
      update: {
        eventId: relatedEventId,
        payload: event as unknown as Prisma.InputJsonValue,
        processingError: null,
      },
    });

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          this.logger.log(
            `payments.stripe.webhook.checkout_completed eventId=${event.id} checkoutSessionId=${session.id} orderId=${session.client_reference_id ?? session.metadata?.orderId ?? "unknown"}`,
          );
          await this.markOrderPaidFromStripeSession(session);
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as any;
          this.logger.log(
            `payments.stripe.webhook.checkout_expired eventId=${event.id} checkoutSessionId=${session.id} orderId=${session.client_reference_id ?? session.metadata?.orderId ?? "unknown"}`,
          );
          await this.markOrderCancelledFromStripeSession(session);
          break;
        }
        default:
          break;
      }

      await this.prisma.webhookEvent.update({
        where: {
          providerEventId: event.id,
        },
        data: {
          processedAt: new Date(),
          processingError: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `payments.stripe.webhook.failed eventId=${event.id} type=${event.type} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      await this.prisma.webhookEvent.update({
        where: {
          providerEventId: event.id,
        },
        data: {
          processingError:
            this.toWebhookProcessingError(event, error),
        },
      });

      throw error;
    }

    return { received: true };
  }

  async getStripeCheckoutState(checkoutSessionId: string): Promise<StripeCheckoutState> {
    const stripe = this.getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url ?? null,
      paymentStatus: session.payment_status ?? null,
      checkoutStatus: session.status ?? null,
      isAwaitingPaymentConfirmation:
        session.payment_status !== "paid" && session.status !== "expired",
    };
  }

  async reconcilePendingOrderWithStripe(order: {
    id: string;
    status: OrderStatus;
    paymentProvider: PaymentProvider;
    checkoutSessionId: string | null;
  }): Promise<StripeCheckoutState | null> {
    if (
      order.paymentProvider !== PaymentProvider.STRIPE ||
      !order.checkoutSessionId ||
      !process.env.STRIPE_SECRET_KEY
    ) {
      return null;
    }

    const checkoutState = await this.getStripeCheckoutState(order.checkoutSessionId);

    this.logger.log(
      `payments.stripe.reconcile.checked orderId=${order.id} checkoutSessionId=${order.checkoutSessionId} orderStatus=${order.status} paymentStatus=${checkoutState.paymentStatus ?? "unknown"} checkoutStatus=${checkoutState.checkoutStatus ?? "unknown"}`,
    );

    if (order.status === OrderStatus.PENDING) {
      if (checkoutState.paymentStatus === "paid") {
        const stripe = this.getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
        await this.markOrderPaidFromStripeSession(session);
      } else if (checkoutState.checkoutStatus === "expired") {
        const stripe = this.getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
        await this.markOrderCancelledFromStripeSession(session);
      }
    }

    return checkoutState;
  }

  private async markOrderPaidFromStripeSession(session: any) {
    const orderId =
      session.client_reference_id ?? session.metadata?.orderId ?? null;

    if (!orderId) {
      this.logger.warn(
        `payments.stripe.mark_paid.missing_order_reference checkoutSessionId=${session.id}`,
      );
      throw new BadRequestException(
        "Stripe checkout session did not include an order reference.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      this.logger.warn(
        `payments.stripe.mark_paid.order_not_found orderId=${orderId} checkoutSessionId=${session.id}`,
      );
      throw new BadRequestException(`Order "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.log(
        `payments.stripe.mark_paid.already_paid orderId=${order.id} checkoutSessionId=${session.id}`,
      );
      return;
    }

    const paidAt = new Date();

    const paidOrder = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          checkoutSessionId: session.id,
          paymentReference:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : order.paymentReference,
          paidAt,
        },
        include: {
          event: true,
          items: {
            include: {
              ticketType: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          tickets: true,
        },
      });

      if (updatedOrder.tickets.length > 0) {
        return updatedOrder;
      }

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
              status: "ISSUED",
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
              changeType: "PURCHASE",
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
      return tx.order.findUniqueOrThrow({
        where: { id: updatedOrder.id },
        include: {
          event: true,
          items: {
            include: {
              ticketType: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          tickets: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    });

    await this.notificationsService.notifyOrderPaid({
      eventTitle: paidOrder.event.title,
      orderId: paidOrder.id,
      ticketCount: paidOrder.tickets.length,
      userId: paidOrder.userId,
    });

    this.logger.log(
      `payments.stripe.mark_paid.completed orderId=${paidOrder.id} checkoutSessionId=${session.id} tickets=${paidOrder.tickets.length} paymentIntent=${typeof session.payment_intent === "string" ? session.payment_intent : "none"}`,
    );
  }

  private async markOrderCancelledFromStripeSession(session: any) {
    const orderId =
      session.client_reference_id ?? session.metadata?.orderId ?? null;

    if (!orderId) {
      this.logger.warn(
        `payments.stripe.mark_cancelled.missing_order_reference checkoutSessionId=${session.id}`,
      );
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.status !== OrderStatus.PENDING) {
      this.logger.log(
        `payments.stripe.mark_cancelled.skipped orderId=${orderId} checkoutSessionId=${session.id} status=${order?.status ?? "missing"}`,
      );
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        checkoutSessionId: session.id,
      },
    });

    this.logger.log(
      `payments.stripe.mark_cancelled.completed orderId=${orderId} checkoutSessionId=${session.id}`,
    );
  }

  private async resolveRelatedEventId(event: any) {
    const session = event?.data?.object;
    const orderId =
      session?.client_reference_id ?? session?.metadata?.orderId ?? null;

    if (!orderId) {
      return null;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { eventId: true },
    });

    return order?.eventId ?? null;
  }

  private toWebhookProcessingError(event: any, error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error.";
    const session = event?.data?.object;
    const orderId =
      session?.client_reference_id ?? session?.metadata?.orderId ?? "unknown";

    return `[${event?.type ?? "unknown"}][order:${orderId}] ${message}`;
  }

  private getStripeClient() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new NotImplementedException(
        "STRIPE_SECRET_KEY must be configured to use Stripe payments.",
      );
    }

    const StripeConstructor = Stripe as unknown as new (
      apiKey: string,
      config?: Record<string, unknown>,
    ) => any;

    return new StripeConstructor(secretKey, {
      apiVersion: "2025-03-31.basil",
    });
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
}
