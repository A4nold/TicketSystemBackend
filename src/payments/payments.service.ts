import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from "@nestjs/common";
import {
  OrderStatus,
  PaymentProvider,
  PaymentTransactionStatus,
  Prisma,
  RefundStatus,
  SettlementState,
} from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import Stripe from "stripe";

import { NotificationsService } from "../notifications/notifications.service";
import { type FeePolicy } from "../orders/fee-policy";
import { PrismaService } from "../prisma/prisma.service";
import { OrganizerStripeAccountService } from "./organizer-stripe-account.service";

type CheckoutOrder = {
  cancelReturnUrl?: string;
  feeAmount: Prisma.Decimal;
  feePolicy: FeePolicy;
  id: string;
  currency: string;
  totalAmount: Prisma.Decimal;
  successReturnUrl?: string;
  userEmail: string;
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
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  paymentStatus: string | null;
  checkoutStatus: string | null;
  isAwaitingPaymentConfirmation: boolean;
  paymentIntentId?: string | null;
  clientSecret?: string | null;
  connectedAccountId?: string | null;
};

type StripeConnectCheckoutOrder = {
  connectedAccountId: string;
  feeAmount: Prisma.Decimal;
  feePolicy: FeePolicy;
  id: string;
  currency: string;
  paymentTransactionId: string;
  totalAmount: Prisma.Decimal;
  userEmail: string;
  userId: string;
  event: {
    title: string;
    slug: string;
  };
};

type StripeRefundRequest = {
  amount: Prisma.Decimal;
  currency: string;
  paymentTransactionId: string;
  providerChargeId: string | null;
  providerPaymentIntentId: string | null;
  reason: string | null;
  refundApplicationFee: boolean;
  refundId: string;
  reverseTransfer: boolean;
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    access_code?: string;
    authorization_url?: string;
    reference?: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    amount?: number;
    currency?: string;
    reference?: string;
    status?: string;
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly organizerStripeAccountService: OrganizerStripeAccountService,
  ) {}

  async createCheckoutSession(order: CheckoutOrder) {
    this.logger.log(
      `payments.stripe.checkout_session.started orderId=${order.id} userId=${order.userId} total=${order.totalAmount.toFixed(2)} currency=${order.currency}`,
    );
    const stripe = this.getStripeClient();
    const frontendUrl = this.normalizeUrlInput(process.env.FRONTEND_APP_URL);

    if (!frontendUrl && (!order.successReturnUrl || !order.cancelReturnUrl)) {
      throw new NotImplementedException(
        "FRONTEND_APP_URL must be configured to create Stripe checkout sessions unless explicit mobile return URLs are provided.",
      );
    }

    const successUrl = this.buildCheckoutReturnUrl({
      allowCustomScheme: false,
      fallbackBaseUrl: `${frontendUrl?.replace(/\/$/, "") ?? ""}/checkout/success`,
      bridgeBaseUrl: this.resolveStripeReturnBridgeUrl(),
      orderId: order.id,
      providedUrl: order.successReturnUrl,
      sessionPlaceholder: true,
    });
    const cancelUrl = this.buildCheckoutReturnUrl({
      allowCustomScheme: false,
      fallbackBaseUrl: `${frontendUrl?.replace(/\/$/, "") ?? ""}/checkout/cancel`,
      bridgeBaseUrl: this.resolveStripeReturnBridgeUrl(),
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

  async createPaystackCheckoutTransaction(order: CheckoutOrder) {
    this.logger.log(
      `payments.paystack.transaction_initialize.started orderId=${order.id} userId=${order.userId} total=${order.totalAmount.toFixed(2)} currency=${order.currency}`,
    );

    const frontendUrl = this.normalizeUrlInput(process.env.FRONTEND_APP_URL);

    if (!frontendUrl && !order.successReturnUrl) {
      throw new NotImplementedException(
        "FRONTEND_APP_URL must be configured to create Paystack checkout transactions unless an explicit return URL is provided.",
      );
    }

    const reference = this.generatePaystackReference(order.id);
    const callbackUrl = this.buildCheckoutReturnUrl({
      fallbackBaseUrl: `${frontendUrl?.replace(/\/$/, "") ?? ""}/checkout/success`,
      orderId: order.id,
      providedUrl: order.successReturnUrl,
      sessionPlaceholder: false,
    });

    const response = await this.paystackFetch<PaystackInitializeResponse>(
      "/transaction/initialize",
      {
        body: JSON.stringify({
          amount: this.toPaymentSubunit(order.totalAmount),
          callback_url: callbackUrl,
          currency: order.currency.toUpperCase(),
          email: order.userEmail,
          metadata: {
            eventSlug: order.event.slug,
            orderId: order.id,
            userId: order.userId,
          },
          reference,
        }),
        method: "POST",
      },
    );

    if (!response.status || !response.data?.authorization_url || !response.data.reference) {
      this.logger.error(
        `payments.paystack.transaction_initialize.failed orderId=${order.id} userId=${order.userId} message="${response.message}"`,
      );
      throw new BadRequestException("Paystack checkout could not be initialized.");
    }

    this.logger.log(
      `payments.paystack.transaction_initialize.completed orderId=${order.id} reference=${response.data.reference}`,
    );

    return {
      checkoutSessionId: response.data.reference,
      checkoutUrl: response.data.authorization_url,
      paymentStatus: "pending",
      checkoutStatus: "initialized",
      isAwaitingPaymentConfirmation: true,
    };
  }

  async createStripeConnectPaymentIntent(order: StripeConnectCheckoutOrder) {
    this.logger.log(
      `payments.stripe.connect_payment_intent.started orderId=${order.id} transactionId=${order.paymentTransactionId} connectedAccountId=${order.connectedAccountId} total=${order.totalAmount.toFixed(2)} currency=${order.currency}`,
    );

    const stripe = this.getStripeClient();

    let paymentIntent: any;

    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: this.toPaymentSubunit(order.totalAmount),
          application_fee_amount: this.toPaymentSubunit(order.feeAmount),
          automatic_payment_methods: {
            enabled: true,
          },
          currency: order.currency.toLowerCase(),
          description: `${order.event.title} ticket purchase`,
          metadata: {
            connectedAccountId: order.connectedAccountId,
            eventSlug: order.event.slug,
            orderId: order.id,
            paymentTransactionId: order.paymentTransactionId,
            userId: order.userId,
          },
          receipt_email: order.userEmail,
          transfer_data: {
            destination: order.connectedAccountId,
          },
        },
        {
          idempotencyKey: `order:${order.id}:payment-intent:create:v1`,
        },
      );
    } catch (error) {
      this.logger.error(
        `payments.stripe.connect_payment_intent.failed orderId=${order.id} transactionId=${order.paymentTransactionId} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    this.logger.log(
      `payments.stripe.connect_payment_intent.completed orderId=${order.id} transactionId=${order.paymentTransactionId} paymentIntentId=${paymentIntent.id} status=${paymentIntent.status ?? "unknown"}`,
    );

    return {
      checkoutSessionId: null,
      checkoutUrl: null,
      paymentStatus: this.mapStripePaymentIntentStatus(paymentIntent.status),
      checkoutStatus: paymentIntent.status ?? null,
      isAwaitingPaymentConfirmation: !["succeeded", "canceled"].includes(
        paymentIntent.status ?? "",
      ),
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? null,
      connectedAccountId: order.connectedAccountId,
    };
  }

  async createStripeRefund(input: StripeRefundRequest) {
    this.logger.log(
      `payments.stripe.refund.started refundId=${input.refundId} paymentTransactionId=${input.paymentTransactionId} amount=${input.amount.toFixed(2)} currency=${input.currency}`,
    );

    if (!input.providerChargeId && !input.providerPaymentIntentId) {
      throw new BadRequestException(
        `Refund "${input.refundId}" does not have a Stripe charge or payment intent reference.`,
      );
    }

    const stripe = this.getStripeClient();

    let refund: any;

    try {
      refund = await stripe.refunds.create(
        {
          ...(input.providerChargeId
            ? { charge: input.providerChargeId }
            : { payment_intent: input.providerPaymentIntentId }),
          amount: this.toPaymentSubunit(input.amount),
          metadata: {
            paymentTransactionId: input.paymentTransactionId,
            refundId: input.refundId,
          },
          reason: this.toStripeRefundReason(input.reason),
          refund_application_fee: input.refundApplicationFee,
          reverse_transfer: input.reverseTransfer,
        },
        {
          idempotencyKey: `refund:${input.refundId}:stripe:create:v1`,
        },
      );
    } catch (error) {
      this.logger.error(
        `payments.stripe.refund.failed refundId=${input.refundId} paymentTransactionId=${input.paymentTransactionId} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    this.logger.log(
      `payments.stripe.refund.completed refundId=${input.refundId} providerRefundId=${refund.id} status=${refund.status ?? "unknown"}`,
    );

    return {
      providerRefundId: refund.id ?? null,
      status: this.mapStripeRefundStatus(refund.status),
      failureReason: refund.failure_reason ?? null,
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
    bridgeBaseUrl,
    orderId,
    providedUrl,
    sessionPlaceholder,
    allowCustomScheme = true,
  }: {
    fallbackBaseUrl: string;
    bridgeBaseUrl?: string | null;
    orderId: string;
    providedUrl?: string;
    sessionPlaceholder: boolean;
    allowCustomScheme?: boolean;
  }) {
    const trimmedProvidedUrl = this.normalizeUrlInput(providedUrl);
    const parsedProvidedUrl = trimmedProvidedUrl
      ? this.tryParseUrl(trimmedProvidedUrl)
      : null;
    const normalizedFallbackBaseUrl = this.normalizeUrlInput(fallbackBaseUrl) ?? fallbackBaseUrl;
    const parsedFallbackUrl = this.tryParseUrl(normalizedFallbackBaseUrl);
    const providedUrlIsHttp =
      parsedProvidedUrl?.protocol === "http:" || parsedProvidedUrl?.protocol === "https:";
    const providedUrlIsAllowed = allowCustomScheme
      ? Boolean(parsedProvidedUrl)
      : providedUrlIsHttp;
    const shouldUseBridgeUrl =
      !allowCustomScheme &&
      Boolean(parsedProvidedUrl) &&
      !providedUrlIsHttp &&
      Boolean(bridgeBaseUrl);

    let baseUrl = providedUrlIsAllowed
      ? trimmedProvidedUrl!
      : parsedFallbackUrl
        ? normalizedFallbackBaseUrl
        : trimmedProvidedUrl || normalizedFallbackBaseUrl;

    if (shouldUseBridgeUrl) {
      const bridgeUrl = new URL(bridgeBaseUrl!);
      const mobileScheme = parsedProvidedUrl?.protocol.replace(":", "");
      const mobilePath = this.normalizeMobileReturnPath(parsedProvidedUrl);

      if (mobileScheme) {
        bridgeUrl.searchParams.set("scheme", mobileScheme);
      }
      bridgeUrl.searchParams.set("path", mobilePath);

      if (parsedFallbackUrl) {
        bridgeUrl.searchParams.set("fallback", normalizedFallbackBaseUrl);
      }

      baseUrl = bridgeUrl.toString();
    }

    if (!baseUrl) {
      throw new NotImplementedException("A valid checkout return URL could not be resolved.");
    }

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("orderId", orderId);

      if (sessionPlaceholder) {
        url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
      }

      let result = url.toString();
      if (sessionPlaceholder) {
        result = result.replace(
          encodeURIComponent("{CHECKOUT_SESSION_ID}"),
          "{CHECKOUT_SESSION_ID}",
        );
      }

      return result;
    } catch {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const sessionSuffix = sessionPlaceholder
        ? `&session_id=${encodeURIComponent("{CHECKOUT_SESSION_ID}")}`
        : "";

      return `${baseUrl}${separator}orderId=${encodeURIComponent(orderId)}${sessionSuffix}`;
    }
  }

  private resolveStripeReturnBridgeUrl() {
    const configuredBaseUrl =
      this.normalizeUrlInput(process.env.BACKEND_PUBLIC_URL) ||
      this.normalizeUrlInput(process.env.PUBLIC_API_URL) ||
      null;

    if (!configuredBaseUrl) {
      return null;
    }

    try {
      const url = new URL(configuredBaseUrl);
      url.pathname = `${url.pathname.replace(/\/$/, "")}/api/payments/stripe/return`;
      url.search = "";
      return url.toString();
    } catch {
      return null;
    }
  }

  private tryParseUrl(value: string) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  private normalizeMobileReturnPath(parsedProvidedUrl: URL | null) {
    if (!parsedProvidedUrl) {
      return "/checkout/success";
    }

    const hostPart = parsedProvidedUrl.host ? `/${parsedProvidedUrl.host}` : "";
    const pathname = parsedProvidedUrl.pathname || "";
    const combined = `${hostPart}${pathname}`.replace(/\/{2,}/g, "/");

    return combined.startsWith("/") ? combined : `/${combined}`;
  }

  private normalizeUrlInput(value?: string | null) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const quoted =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"));

    return quoted ? trimmed.slice(1, -1).trim() : trimmed;
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

    const result = await this.processStripeEvent(event, {
      allowDuplicateSkip: true,
      isReplay: false,
    });
    return result.duplicate ? { received: true, duplicate: true } : { received: true };
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new NotImplementedException(
        "PAYSTACK_SECRET_KEY must be configured to process Paystack webhooks.",
      );
    }

    if (!this.isValidPaystackSignature(rawBody, signature, secretKey)) {
      this.logger.warn("payments.paystack.webhook.invalid_signature");
      throw new BadRequestException("Invalid Paystack webhook signature.");
    }

    let event: any;

    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid Paystack webhook payload.");
    }

    const result = await this.processPaystackEvent(event, {
      allowDuplicateSkip: true,
      isReplay: false,
    });
    return result.duplicate ? { received: true, duplicate: true } : { received: true };
  }

  async replayStoredWebhook(providerEventId: string) {
    const webhookEvent = await this.prisma.webhookEvent.findUnique({
      where: { providerEventId },
    });

    if (!webhookEvent) {
      throw new BadRequestException(`Webhook event "${providerEventId}" was not found.`);
    }

    if (webhookEvent.provider === PaymentProvider.STRIPE) {
      return this.processStripeEvent(webhookEvent.payload, {
        allowDuplicateSkip: false,
        isReplay: true,
      });
    }

    return this.processPaystackEvent(webhookEvent.payload, {
      allowDuplicateSkip: false,
      isReplay: true,
    });
  }

  async syncStripeAccount(accountId: string) {
    const stripe = this.getStripeClient();
    const account = await stripe.accounts.retrieve(accountId);
    await this.organizerStripeAccountService.syncFromStripeWebhook(account);
    return { resourceId: accountId, resourceType: "account", synced: true };
  }

  async syncStripePaymentIntent(paymentIntentId: string) {
    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      await this.markOrderPaidFromStripePaymentIntent(paymentIntent);
    } else if (
      paymentIntent.status === "canceled" ||
      paymentIntent.status === "requires_payment_method"
    ) {
      await this.markOrderFailedFromStripePaymentIntent(paymentIntent);
    }

    return { resourceId: paymentIntentId, resourceType: "payment_intent", synced: true };
  }

  async syncStripeCharge(chargeId: string) {
    const stripe = this.getStripeClient();
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["refunds"],
    });

    await this.syncRefundsFromStripeCharge(charge);
    return { resourceId: chargeId, resourceType: "charge", synced: true };
  }

  async syncStripeRefund(refundId: string) {
    const stripe = this.getStripeClient();
    const refund = await stripe.refunds.retrieve(refundId);

    if (typeof refund.charge === "string") {
      await this.syncStripeCharge(refund.charge);
    }

    return { resourceId: refundId, resourceType: "refund", synced: true };
  }

  async syncStripeDispute(disputeId: string) {
    const stripe = this.getStripeClient();
    const dispute = await stripe.disputes.retrieve(disputeId);
    await this.recordStripeDispute(dispute);
    return { resourceId: disputeId, resourceType: "dispute", synced: true };
  }

  async repairOrderPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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
        paymentTransactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        tickets: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      throw new BadRequestException(`Order "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PENDING) {
      await this.reconcilePendingOrderWithProvider(order);
      return { message: "Reconciled pending order with payment provider.", orderId, repaired: true };
    }

    if (order.status === OrderStatus.PAID && order.tickets.length === 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.issueTicketsForPaidOrder(tx, order, order.paidAt ?? new Date());
      });

      return { message: "Issued missing tickets for paid order.", orderId, repaired: true };
    }

    return { message: "No repair action was required.", orderId, repaired: false };
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

  async getStripeConnectPaymentIntentState(
    paymentIntentId: string,
  ): Promise<StripeCheckoutState> {
    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      checkoutSessionId: null,
      checkoutUrl: null,
      paymentStatus: this.mapStripePaymentIntentStatus(paymentIntent.status),
      checkoutStatus: paymentIntent.status ?? null,
      isAwaitingPaymentConfirmation: !["succeeded", "canceled"].includes(
        paymentIntent.status ?? "",
      ),
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? null,
      connectedAccountId:
        paymentIntent.transfer_data?.destination ??
        paymentIntent.metadata?.connectedAccountId ??
        null,
    };
  }

  async getPaystackCheckoutState(reference: string): Promise<StripeCheckoutState> {
    const verification = await this.verifyPaystackTransaction(reference);
    const status = verification.data?.status ?? null;

    return {
      checkoutSessionId: reference,
      checkoutUrl: null,
      paymentStatus: status,
      checkoutStatus: status,
      isAwaitingPaymentConfirmation: !["success", "abandoned", "failed"].includes(
        status ?? "",
      ),
    };
  }

  async reconcilePendingOrderWithStripe(order: {
    id: string;
    status: OrderStatus;
    paymentProvider: PaymentProvider;
    checkoutSessionId: string | null;
    paymentTransactions?: Array<{
      providerPaymentIntentId: string | null;
      connectedAccountId: string | null;
    }>;
  }): Promise<StripeCheckoutState | null> {
    if (order.paymentProvider !== PaymentProvider.STRIPE || !process.env.STRIPE_SECRET_KEY) {
      return null;
    }

    const latestPaymentTransaction = order.paymentTransactions?.[0] ?? null;

    if (order.checkoutSessionId) {
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

    if (!latestPaymentTransaction?.providerPaymentIntentId) {
      return null;
    }

    const paymentIntentState = await this.getStripeConnectPaymentIntentState(
      latestPaymentTransaction.providerPaymentIntentId,
    );

    this.logger.log(
      `payments.stripe.reconcile.connect_checked orderId=${order.id} paymentIntentId=${latestPaymentTransaction.providerPaymentIntentId} orderStatus=${order.status} paymentStatus=${paymentIntentState.paymentStatus ?? "unknown"} checkoutStatus=${paymentIntentState.checkoutStatus ?? "unknown"}`,
    );

    if (order.status === OrderStatus.PENDING) {
      if (paymentIntentState.checkoutStatus === "succeeded") {
        const stripe = this.getStripeClient();
        const paymentIntent = await stripe.paymentIntents.retrieve(
          latestPaymentTransaction.providerPaymentIntentId,
        );
        await this.markOrderPaidFromStripePaymentIntent(paymentIntent);
      } else if (paymentIntentState.checkoutStatus === "canceled") {
        const stripe = this.getStripeClient();
        const paymentIntent = await stripe.paymentIntents.retrieve(
          latestPaymentTransaction.providerPaymentIntentId,
        );
        await this.markOrderFailedFromStripePaymentIntent(paymentIntent);
      }
    }

    return paymentIntentState;
  }

  async reconcilePendingOrderWithProvider(order: {
    id: string;
    status: OrderStatus;
    paymentProvider: PaymentProvider;
    checkoutSessionId: string | null;
    paymentTransactions?: Array<{
      providerPaymentIntentId: string | null;
      connectedAccountId: string | null;
    }>;
  }): Promise<StripeCheckoutState | null> {
    if (order.paymentProvider === PaymentProvider.STRIPE) {
      return this.reconcilePendingOrderWithStripe(order);
    }

    if (
      order.paymentProvider !== PaymentProvider.PAYSTACK ||
      !order.checkoutSessionId ||
      !process.env.PAYSTACK_SECRET_KEY
    ) {
      return null;
    }

    const checkoutState = await this.getPaystackCheckoutState(order.checkoutSessionId);

    this.logger.log(
      `payments.paystack.reconcile.checked orderId=${order.id} reference=${order.checkoutSessionId} orderStatus=${order.status} paymentStatus=${checkoutState.paymentStatus ?? "unknown"} checkoutStatus=${checkoutState.checkoutStatus ?? "unknown"}`,
    );

    if (order.status === OrderStatus.PENDING) {
      if (checkoutState.paymentStatus === "success") {
        await this.verifyAndApplyPaystackReference(order.checkoutSessionId);
      } else if (["abandoned", "failed"].includes(checkoutState.paymentStatus ?? "")) {
        await this.markOrderCancelledFromPaystackReference(order.checkoutSessionId);
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
      include: {
        tickets: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!order) {
      this.logger.warn(
        `payments.stripe.mark_paid.order_not_found orderId=${orderId} checkoutSessionId=${session.id}`,
      );
      throw new BadRequestException(`Order "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PAID && order.tickets.length > 0) {
      this.logger.log(
        `payments.stripe.mark_paid.already_paid orderId=${order.id} checkoutSessionId=${session.id}`,
      );
      return;
    }

    const paidAt = order.paidAt ?? new Date();

    const paidOrder = await this.prisma.$transaction(async (tx) => {
      const updatedOrder =
        order.status === OrderStatus.PENDING
          ? await tx.order.update({
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
            })
          : await tx.order.findUniqueOrThrow({
              where: { id: orderId },
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

      await this.issueTicketsForPaidOrder(tx, updatedOrder, paidAt);

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

  private async markOrderPaidFromStripePaymentIntent(paymentIntent: any) {
    const orderId = paymentIntent.metadata?.orderId ?? null;

    if (!orderId) {
      this.logger.warn(
        `payments.stripe.connect_mark_paid.missing_order_reference paymentIntentId=${paymentIntent.id}`,
      );
      throw new BadRequestException(
        "Stripe payment intent did not include an order reference.",
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!order) {
      this.logger.warn(
        `payments.stripe.connect_mark_paid.order_not_found orderId=${orderId} paymentIntentId=${paymentIntent.id}`,
      );
      throw new BadRequestException(`Order "${orderId}" was not found.`);
    }

    if (order.status === OrderStatus.PAID && order.tickets.length > 0) {
      this.logger.log(
        `payments.stripe.connect_mark_paid.already_paid orderId=${order.id} paymentIntentId=${paymentIntent.id}`,
      );
      return;
    }

    const paidAt = order.paidAt ?? new Date();
    const providerChargeId = this.extractStripeChargeId(paymentIntent);

    const paidOrder = await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.updateMany({
        where: {
          orderId,
          provider: PaymentProvider.STRIPE,
          providerPaymentIntentId: paymentIntent.id,
        },
        data: {
          status: PaymentTransactionStatus.SUCCEEDED,
          providerReference: paymentIntent.id,
          providerChargeId,
          connectedAccountId:
            paymentIntent.transfer_data?.destination ??
            paymentIntent.metadata?.connectedAccountId ??
            null,
          capturedAt: paidAt,
          failureReason: null,
          failedAt: null,
        },
      });

      const paymentTransaction = await tx.paymentTransaction.findFirst({
        where: {
          orderId,
          provider: PaymentProvider.STRIPE,
          providerPaymentIntentId: paymentIntent.id,
        },
      });

      if (paymentTransaction) {
        await this.ensureOrganizerEarningForTransaction(tx, paymentTransaction.id);
      }

      const updatedOrder =
        order.status === OrderStatus.PENDING
          ? await tx.order.update({
              where: { id: orderId },
              data: {
                status: OrderStatus.PAID,
                paymentReference: paymentIntent.id,
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
            })
          : await tx.order.findUniqueOrThrow({
              where: { id: orderId },
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

      await this.issueTicketsForPaidOrder(tx, updatedOrder, paidAt);

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
      `payments.stripe.connect_mark_paid.completed orderId=${paidOrder.id} paymentIntentId=${paymentIntent.id} chargeId=${providerChargeId ?? "none"} tickets=${paidOrder.tickets.length}`,
    );
  }

  private async issueTicketsForPaidOrder(
    tx: Prisma.TransactionClient,
    order: {
      event: { slug: string };
      eventId: string;
      id: string;
      items: Array<{
        id: string;
        quantity: number;
        ticketType: { name: string };
        ticketTypeId: string;
      }>;
      userId: string;
    },
    paidAt: Date,
  ) {
    const eventCode = this.toEventCode(order.event.slug);

    for (const item of order.items) {
      const existingCount = await tx.ticket.count({
        where: {
          eventId: order.eventId,
          ticketTypeId: item.ticketTypeId,
        },
      });

      for (let index = 0; index < item.quantity; index += 1) {
        await this.createIssuedTicketWithRetry(tx, {
          eventCode,
          eventId: order.eventId,
          orderId: order.id,
          orderItemId: item.id,
          paidAt,
          sequence: existingCount + index + 1,
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.ticketType.name,
          userId: order.userId,
        });
      }
    }
  }

  private async createIssuedTicketWithRetry(
    tx: Prisma.TransactionClient,
    input: {
      eventCode: string;
      eventId: string;
      orderId: string;
      orderItemId: string;
      paidAt: Date;
      sequence: number;
      ticketTypeId: string;
      ticketTypeName: string;
      userId: string;
    },
  ) {
    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const serialNumber = this.generateSerialNumber(
        input.eventCode,
        input.ticketTypeName,
        input.ticketTypeId,
        input.sequence + attempt,
      );

      try {
        const ticket = await tx.ticket.create({
          data: {
            eventId: input.eventId,
            ticketTypeId: input.ticketTypeId,
            orderId: input.orderId,
            currentOwnerId: input.userId,
            status: "ISSUED",
            serialNumber,
            qrTokenId: this.generateQrTokenId(serialNumber),
            ownershipRevision: 1,
            issuedAt: input.paidAt,
          },
        });

        await tx.ticketOwnershipHistory.create({
          data: {
            ticketId: ticket.id,
            fromUserId: null,
            toUserId: input.userId,
            changeType: "PURCHASE",
            revision: 1,
            metadata: {
              orderId: input.orderId,
              orderItemId: input.orderItemId,
              serialNumber,
            },
          },
        });

        return;
      } catch (error) {
        const isSerialCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes("serial_number");

        if (!isSerialCollision || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }
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

  private async markOrderFailedFromStripePaymentIntent(paymentIntent: any) {
    const orderId = paymentIntent.metadata?.orderId ?? null;

    if (!orderId) {
      this.logger.warn(
        `payments.stripe.connect_mark_failed.missing_order_reference paymentIntentId=${paymentIntent.id}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.updateMany({
        where: {
          orderId,
          provider: PaymentProvider.STRIPE,
          providerPaymentIntentId: paymentIntent.id,
        },
        data: {
          status: PaymentTransactionStatus.FAILED,
          providerReference: paymentIntent.id,
          failureReason:
            paymentIntent.last_payment_error?.message ??
            paymentIntent.cancellation_reason ??
            "Stripe payment intent failed.",
          failedAt: new Date(),
        },
      });

      await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.FAILED,
        },
      });
    });

    this.logger.log(
      `payments.stripe.connect_mark_failed.completed orderId=${orderId} paymentIntentId=${paymentIntent.id}`,
    );
  }

  private async syncRefundsFromStripeCharge(charge: any) {
    const paymentTransaction = await this.findPaymentTransactionForStripeCharge(charge);

    if (!paymentTransaction) {
      this.logger.warn(
        `payments.stripe.refund.payment_transaction_not_found chargeId=${charge.id ?? "unknown"} paymentIntentId=${charge.payment_intent ?? "unknown"}`,
      );
      return;
    }

    const refundObjects = Array.isArray(charge.refunds?.data)
      ? charge.refunds.data
      : [];

    const fallbackRefund =
      refundObjects.length === 0 && charge.amount_refunded
        ? [
            {
              amount: charge.amount_refunded,
              created: charge.created,
              id: `derived:${charge.id}`,
              metadata: charge.metadata ?? {},
              reason: charge.refunds?.data?.[0]?.reason ?? null,
              refund_application_fee: false,
              reverse_transfer: false,
              status: "succeeded",
            },
          ]
        : refundObjects;

    const refundedAmount = this.fromPaymentSubunit(charge.amount_refunded ?? 0);
    const isFullyRefunded =
      refundedAmount.greaterThanOrEqualTo(paymentTransaction.grossAmount);
    const refundedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const refund of fallbackRefund) {
        const providerRefundId =
          typeof refund.id === "string" && refund.id.trim().length > 0
            ? refund.id
            : null;

        if (!providerRefundId) {
          continue;
        }

        await tx.refund.upsert({
          where: {
            provider_providerRefundId: {
              provider: PaymentProvider.STRIPE,
              providerRefundId,
            },
          },
          create: {
            orderId: paymentTransaction.orderId,
            paymentTransactionId: paymentTransaction.id,
            provider: PaymentProvider.STRIPE,
            status: this.mapStripeRefundStatus(refund.status),
            providerRefundId,
            amount: this.fromPaymentSubunit(refund.amount ?? 0),
            currency: (refund.currency ?? charge.currency ?? paymentTransaction.currency).toUpperCase(),
            reverseTransfer: Boolean(refund.reverse_transfer),
            refundApplicationFee: Boolean(refund.refund_application_fee),
            reason: refund.reason ?? null,
            requestedAt: this.fromStripeTimestamp(refund.created) ?? refundedAt,
            processedAt:
              refund.status === "succeeded"
                ? this.fromStripeTimestamp(refund.created) ?? refundedAt
                : null,
            failedAt:
              refund.status === "failed"
                ? this.fromStripeTimestamp(refund.created) ?? refundedAt
                : null,
            metadata: (refund.metadata ?? {}) as Prisma.InputJsonValue,
          },
          update: {
            orderId: paymentTransaction.orderId,
            paymentTransactionId: paymentTransaction.id,
            status: this.mapStripeRefundStatus(refund.status),
            amount: this.fromPaymentSubunit(refund.amount ?? 0),
            currency: (refund.currency ?? charge.currency ?? paymentTransaction.currency).toUpperCase(),
            reverseTransfer: Boolean(refund.reverse_transfer),
            refundApplicationFee: Boolean(refund.refund_application_fee),
            reason: refund.reason ?? null,
            processedAt:
              refund.status === "succeeded"
                ? this.fromStripeTimestamp(refund.created) ?? refundedAt
                : null,
            failedAt:
              refund.status === "failed"
                ? this.fromStripeTimestamp(refund.created) ?? refundedAt
                : null,
            metadata: (refund.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });
      }

      await tx.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          settlementState: isFullyRefunded
            ? SettlementState.FAILED
            : SettlementState.ON_HOLD,
        },
      });

      await tx.organizerEarning.updateMany({
        where: {
          paymentTransactionId: paymentTransaction.id,
        },
        data: {
          settlementState: isFullyRefunded
            ? SettlementState.FAILED
            : SettlementState.ON_HOLD,
          settledAt: null,
        },
      });

      if (paymentTransaction.orderId) {
        await tx.order.update({
          where: { id: paymentTransaction.orderId },
          data: {
            status: isFullyRefunded
              ? OrderStatus.REFUNDED
              : OrderStatus.PARTIALLY_REFUNDED,
            refundedAt: refundedAt,
          },
        });
      }
    });
  }

  private async recordStripeDispute(dispute: any) {
    if (!dispute.charge) {
      this.logger.warn(
        `payments.stripe.dispute.missing_charge disputeId=${dispute.id ?? "unknown"}`,
      );
      return;
    }

    const paymentTransaction = await this.prisma.paymentTransaction.findUnique({
      where: {
        provider_providerChargeId: {
          provider: PaymentProvider.STRIPE,
          providerChargeId: dispute.charge,
        },
      },
    });

    if (!paymentTransaction) {
      this.logger.warn(
        `payments.stripe.dispute.payment_transaction_not_found disputeId=${dispute.id ?? "unknown"} chargeId=${dispute.charge}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.upsert({
        where: {
          provider_providerDisputeId: {
            provider: PaymentProvider.STRIPE,
            providerDisputeId: dispute.id,
          },
        },
        create: {
          paymentTransactionId: paymentTransaction.id,
          provider: PaymentProvider.STRIPE,
          providerDisputeId: dispute.id,
          providerChargeId: dispute.charge,
          amount: this.fromPaymentSubunit(dispute.amount ?? 0),
          currency: (dispute.currency ?? paymentTransaction.currency).toUpperCase(),
          reason: dispute.reason ?? null,
          status: dispute.status ?? "warning_needs_response",
          evidenceDueBy: this.fromStripeTimestamp(dispute.evidence_details?.due_by),
          needsResponse: Boolean(dispute.is_charge_refundable ?? dispute.evidence_details?.has_evidence === false),
          metadata: (dispute as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
        update: {
          providerChargeId: dispute.charge,
          amount: this.fromPaymentSubunit(dispute.amount ?? 0),
          currency: (dispute.currency ?? paymentTransaction.currency).toUpperCase(),
          reason: dispute.reason ?? null,
          status: dispute.status ?? "warning_needs_response",
          evidenceDueBy: this.fromStripeTimestamp(dispute.evidence_details?.due_by),
          needsResponse: Boolean(dispute.is_charge_refundable ?? dispute.evidence_details?.has_evidence === false),
          metadata: (dispute as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      await tx.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          settlementState: SettlementState.ON_HOLD,
        },
      });

      await tx.organizerEarning.updateMany({
        where: { paymentTransactionId: paymentTransaction.id },
        data: {
          settlementState: SettlementState.ON_HOLD,
          settledAt: null,
        },
      });
    });
  }

  private async verifyAndApplyPaystackReference(reference: string) {
    const verification = await this.verifyPaystackTransaction(reference);

    if (!verification.status || !verification.data) {
      throw new BadRequestException("Paystack verification failed.");
    }

    if (verification.data.status !== "success") {
      return;
    }

    const order = await this.prisma.order.findFirst({
      where: {
        checkoutSessionId: reference,
        paymentProvider: PaymentProvider.PAYSTACK,
      },
    });

    if (!order) {
      throw new BadRequestException(`Paystack order for reference "${reference}" was not found.`);
    }

    const verifiedAmount = verification.data.amount;
    const verifiedCurrency = verification.data.currency?.toUpperCase();
    const expectedAmount = this.toPaymentSubunit(order.totalAmount);

    if (
      verifiedAmount !== expectedAmount ||
      verifiedCurrency !== order.currency.toUpperCase()
    ) {
      throw new BadRequestException(
        `Paystack verification mismatch for order "${order.id}".`,
      );
    }

    await this.markOrderPaidFromStripeSession({
      client_reference_id: order.id,
      id: reference,
      payment_intent: reference,
    });

    this.logger.log(
      `payments.paystack.mark_paid.completed orderId=${order.id} reference=${reference}`,
    );
  }

  private async markOrderCancelledFromPaystackReference(reference: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        checkoutSessionId: reference,
        paymentProvider: PaymentProvider.PAYSTACK,
      },
    });

    if (!order || order.status !== OrderStatus.PENDING) {
      this.logger.log(
        `payments.paystack.mark_cancelled.skipped reference=${reference} orderId=${order?.id ?? "missing"} status=${order?.status ?? "missing"}`,
      );
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        cancelledAt: new Date(),
        status: OrderStatus.CANCELLED,
      },
    });

    this.logger.log(
      `payments.paystack.mark_cancelled.completed orderId=${order.id} reference=${reference}`,
    );
  }

  private async resolveRelatedEventId(event: any) {
    const object = event?.data?.object;
    const orderId =
      object?.client_reference_id ?? object?.metadata?.orderId ?? null;

    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { eventId: true },
      });

      return order?.eventId ?? null;
    }

    const providerChargeId = object?.charge ?? object?.id ?? null;
    const paymentIntentId = object?.payment_intent ?? null;

    if (providerChargeId) {
      const paymentTransaction = await this.prisma.paymentTransaction.findUnique({
        where: {
          provider_providerChargeId: {
            provider: PaymentProvider.STRIPE,
            providerChargeId,
          },
        },
        select: { eventId: true },
      });

      if (paymentTransaction?.eventId) {
        return paymentTransaction.eventId;
      }
    }

    if (paymentIntentId) {
      const paymentTransaction = await this.prisma.paymentTransaction.findUnique({
        where: {
          provider_providerPaymentIntentId: {
            provider: PaymentProvider.STRIPE,
            providerPaymentIntentId: paymentIntentId,
          },
        },
        select: { eventId: true },
      });

      return paymentTransaction?.eventId ?? null;
    }

    return null;
  }

  private async processStripeEvent(
    event: any,
    options: { allowDuplicateSkip: boolean; isReplay: boolean },
  ) {
    this.logger.log(
      `payments.stripe.webhook.received eventId=${event.id} type=${event.type} replay=${options.isReplay}`,
    );

    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        providerEventId: event.id,
      },
    });

    if (options.allowDuplicateSkip && existing?.processedAt) {
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
        deliveryAttempts: 1,
        lastAttemptAt: new Date(),
        processedAt: null,
      },
      update: {
        deliveryAttempts: (existing?.deliveryAttempts ?? 0) + 1,
        eventId: relatedEventId,
        lastAttemptAt: new Date(),
        payload: event as unknown as Prisma.InputJsonValue,
        processingError: null,
        processedAt: null,
      },
    });

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          await this.markOrderPaidFromStripeSession(session);
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as any;
          await this.markOrderCancelledFromStripeSession(session);
          break;
        }
        case "payment_intent.succeeded": {
          await this.markOrderPaidFromStripePaymentIntent(event.data.object as any);
          break;
        }
        case "payment_intent.payment_failed": {
          await this.markOrderFailedFromStripePaymentIntent(event.data.object as any);
          break;
        }
        case "charge.refunded": {
          await this.syncRefundsFromStripeCharge(event.data.object as any);
          break;
        }
        case "charge.dispute.created": {
          await this.recordStripeDispute(event.data.object as any);
          break;
        }
        case "account.updated": {
          await this.organizerStripeAccountService.syncFromStripeWebhook(
            event.data.object as any,
          );
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
      await this.prisma.webhookEvent.update({
        where: {
          providerEventId: event.id,
        },
        data: {
          processingError: this.toWebhookProcessingError(event, error),
        },
      });

      throw error;
    }

    return { received: true, replayed: options.isReplay };
  }

  private async processPaystackEvent(
    event: any,
    options: { allowDuplicateSkip: boolean; isReplay: boolean },
  ) {
    const reference = event?.data?.reference;
    const eventType = event?.event ?? "unknown";

    if (!reference) {
      throw new BadRequestException("Paystack webhook did not include a transaction reference.");
    }

    const providerEventId = `paystack:${eventType}:${reference}`;

    this.logger.log(
      `payments.paystack.webhook.received eventId=${providerEventId} type=${eventType} replay=${options.isReplay}`,
    );

    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        providerEventId,
      },
    });

    if (options.allowDuplicateSkip && existing?.processedAt) {
      this.logger.log(
        `payments.paystack.webhook.duplicate eventId=${providerEventId} type=${eventType}`,
      );
      return { received: true, duplicate: true };
    }

    const relatedEventId = await this.resolveRelatedEventIdFromOrderId(
      event?.data?.metadata?.orderId ?? null,
    );

    await this.prisma.webhookEvent.upsert({
      where: {
        providerEventId,
      },
      create: {
        eventId: relatedEventId,
        provider: PaymentProvider.PAYSTACK,
        providerEventId,
        eventType,
        payload: event as unknown as Prisma.InputJsonValue,
        deliveryAttempts: 1,
        lastAttemptAt: new Date(),
        processedAt: null,
      },
      update: {
        deliveryAttempts: (existing?.deliveryAttempts ?? 0) + 1,
        eventId: relatedEventId,
        lastAttemptAt: new Date(),
        payload: event as unknown as Prisma.InputJsonValue,
        processingError: null,
        processedAt: null,
      },
    });

    try {
      if (eventType === "charge.success") {
        await this.verifyAndApplyPaystackReference(reference);
      }

      await this.prisma.webhookEvent.update({
        where: {
          providerEventId,
        },
        data: {
          processedAt: new Date(),
          processingError: null,
        },
      });
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: {
          providerEventId,
        },
        data: {
          processingError: `[${eventType}][reference:${reference}] ${
            error instanceof Error ? error.message : "Unknown webhook processing error."
          }`,
        },
      });

      throw error;
    }

    return { received: true, replayed: options.isReplay };
  }

  private async resolveRelatedEventIdFromOrderId(orderId: string | null) {
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

  private async ensureOrganizerEarningForTransaction(
    tx: Prisma.TransactionClient,
    paymentTransactionId: string,
  ) {
    const existingEarning = await tx.organizerEarning.findFirst({
      where: {
        paymentTransactionId,
      },
    });

    if (existingEarning) {
      return tx.organizerEarning.update({
        where: { id: existingEarning.id },
        data: {
          grossAmount: existingEarning.grossAmount,
        },
      });
    }

    const paymentTransaction = await tx.paymentTransaction.findUniqueOrThrow({
      where: { id: paymentTransactionId },
    });

    return tx.organizerEarning.create({
      data: {
        organizerId: paymentTransaction.organizerId,
        eventId: paymentTransaction.eventId,
        orderId: paymentTransaction.orderId,
        resaleListingId: paymentTransaction.resaleListingId,
        paymentTransactionId: paymentTransaction.id,
        grossAmount: paymentTransaction.grossAmount,
        platformFeeAmount: paymentTransaction.platformFeeAmount,
        netAmount: paymentTransaction.organizerNetAmount,
        currency: paymentTransaction.currency,
        settlementState: paymentTransaction.settlementState,
      },
    });
  }

  private async findPaymentTransactionForStripeCharge(charge: any) {
    if (charge.id) {
      const byChargeId = await this.prisma.paymentTransaction.findUnique({
        where: {
          provider_providerChargeId: {
            provider: PaymentProvider.STRIPE,
            providerChargeId: charge.id,
          },
        },
      });

      if (byChargeId) {
        return byChargeId;
      }
    }

    if (typeof charge.payment_intent === "string") {
      return this.prisma.paymentTransaction.findUnique({
        where: {
          provider_providerPaymentIntentId: {
            provider: PaymentProvider.STRIPE,
            providerPaymentIntentId: charge.payment_intent,
          },
        },
      });
    }

    return null;
  }

  private mapStripePaymentIntentStatus(status: string | null | undefined) {
    switch (status) {
      case "succeeded":
        return "paid";
      case "processing":
        return "processing";
      case "requires_action":
        return "requires_action";
      case "requires_payment_method":
        return "requires_payment_method";
      case "canceled":
        return "failed";
      default:
        return status ?? null;
    }
  }

  private mapStripeRefundStatus(status: string | null | undefined) {
    switch (status) {
      case "succeeded":
        return RefundStatus.SUCCEEDED;
      case "failed":
        return RefundStatus.FAILED;
      case "canceled":
        return RefundStatus.CANCELLED;
      case "pending":
      case "requires_action":
        return RefundStatus.PROCESSING;
      default:
        return RefundStatus.REQUESTED;
    }
  }

  private toStripeRefundReason(reason: string | null) {
    if (!reason) {
      return undefined;
    }

    switch (reason) {
      case "duplicate":
      case "fraudulent":
      case "requested_by_customer":
        return reason;
      default:
        return undefined;
    }
  }

  private extractStripeChargeId(paymentIntent: any) {
    if (typeof paymentIntent.latest_charge === "string") {
      return paymentIntent.latest_charge;
    }

    if (paymentIntent.latest_charge?.id) {
      return paymentIntent.latest_charge.id;
    }

    const charges = paymentIntent.charges?.data;

    if (Array.isArray(charges) && charges[0]?.id) {
      return charges[0].id;
    }

    return null;
  }

  private fromStripeTimestamp(timestamp: number | null | undefined) {
    if (!timestamp) {
      return null;
    }

    return new Date(timestamp * 1000);
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

  private async paystackFetch<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new NotImplementedException(
        "PAYSTACK_SECRET_KEY must be configured to use Paystack payments.",
      );
    }

    const response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new BadRequestException(
        payload?.message ?? `Paystack request failed with ${response.status}.`,
      );
    }

    return payload as T;
  }

  private verifyPaystackTransaction(reference: string) {
    return this.paystackFetch<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
      },
    );
  }

  private isValidPaystackSignature(
    rawBody: Buffer,
    signature: string,
    secretKey: string,
  ) {
    const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  }

  private generatePaystackReference(orderId: string) {
    return `order-${orderId}-${Date.now().toString(36)}`;
  }

  private toPaymentSubunit(amount: Prisma.Decimal) {
    return Math.round(Number(amount) * 100);
  }

  private fromPaymentSubunit(amount: number) {
    return new Prisma.Decimal(amount).div(100).toDecimalPlaces(2);
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
    ticketTypeId: string,
    sequence: number,
  ) {
    return `${eventCode}-${this.toTicketTypeCode(ticketTypeName)}${this.toTicketTypeIdCode(ticketTypeId)}-${String(sequence).padStart(4, "0")}`;
  }

  private toTicketTypeIdCode(ticketTypeId: string) {
    const compact = ticketTypeId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-4)
      .toUpperCase();

    return compact.padStart(4, "0");
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
  }
}
