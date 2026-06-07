import {
  OrderStatus,
  PaymentProvider,
  PaymentTransactionStatus,
  Prisma,
  TicketStatus,
} from "@prisma/client";

import { type FeePolicy } from "../fee-policy";

type OrderResponseSource = {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  feePolicy?: FeePolicy;
  paymentProvider: PaymentProvider;
  paymentReference: string | null;
  checkoutSessionId: string | null;
  paymentTransactions?: Array<{
    id: string;
    status: PaymentTransactionStatus;
    connectedAccountId: string | null;
    providerPaymentIntentId: string | null;
  }>;
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
};

type CheckoutState = {
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  paymentStatus: string | null;
  checkoutStatus: string | null;
  isAwaitingPaymentConfirmation: boolean;
  paymentIntentId?: string | null;
  clientSecret?: string | null;
  connectedAccountId?: string | null;
} | null;

export function toOrderResponse(
  order: OrderResponseSource,
  checkoutState?: CheckoutState,
) {
  const latestPaymentTransaction = order.paymentTransactions?.[0] ?? null;
  const paymentIntentId =
    checkoutState?.paymentIntentId ??
    latestPaymentTransaction?.providerPaymentIntentId ??
    null;
  const paymentTransactionId = latestPaymentTransaction?.id ?? null;
  const clientSecret = checkoutState?.clientSecret ?? null;
  const connectedAccountId =
    checkoutState?.connectedAccountId ??
    latestPaymentTransaction?.connectedAccountId ??
    null;
  const paymentStatus =
    checkoutState?.paymentStatus ??
    order.paymentStatus ??
    mapPaymentTransactionStatusToPaymentStatus(latestPaymentTransaction?.status) ??
    null;
  const checkoutStatus =
    checkoutState?.checkoutStatus ?? order.checkoutStatus ?? null;
  const checkoutUrl = checkoutState?.checkoutUrl ?? order.checkoutUrl ?? null;
  const checkoutSessionId =
    checkoutState?.checkoutSessionId ?? order.checkoutSessionId;
  const isAwaitingPaymentConfirmation =
    checkoutState?.isAwaitingPaymentConfirmation ??
    order.isAwaitingPaymentConfirmation ??
    (order.status === OrderStatus.PENDING &&
      (order.paymentProvider === PaymentProvider.STRIPE ||
        order.paymentProvider === PaymentProvider.PAYSTACK) &&
      (Boolean(order.checkoutSessionId) || Boolean(paymentIntentId)) &&
      !["paid", "success"].includes(paymentStatus ?? "") &&
      !["expired", "abandoned", "failed"].includes(checkoutStatus ?? ""));

  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount.toFixed(2),
    feeAmount: order.feeAmount.toFixed(2),
    totalAmount: order.totalAmount.toFixed(2),
    feePolicy: {
      displayName: order.feePolicy?.displayName ?? "Service fee",
      model: order.feePolicy?.model ?? "BLENDED",
      responsibility: order.feePolicy?.responsibility ?? "BUYER",
      percentRate: order.feePolicy?.percentRate.toString() ?? "0.0695",
      fixedAmount: order.feePolicy?.fixedAmount.toFixed(2) ?? "0.69",
      fixedFeeApplication: order.feePolicy?.fixedFeeApplication ?? "PER_TICKET",
    },
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    checkoutSessionId,
    paymentTransactionId,
    paymentIntentId,
    clientSecret,
    connectedAccountId,
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

function mapPaymentTransactionStatusToPaymentStatus(
  status: PaymentTransactionStatus | undefined,
) {
  switch (status) {
    case PaymentTransactionStatus.SUCCEEDED:
      return "paid";
    case PaymentTransactionStatus.FAILED:
      return "failed";
    case PaymentTransactionStatus.CANCELLED:
      return "cancelled";
    case PaymentTransactionStatus.REQUIRES_ACTION:
      return "requires_action";
    case PaymentTransactionStatus.PROCESSING:
      return "processing";
    case PaymentTransactionStatus.PENDING:
      return "pending";
    default:
      return null;
  }
}
