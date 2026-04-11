import { OrderStatus, PaymentProvider, Prisma, TicketStatus } from "@prisma/client";

type OrderResponseSource = {
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
};

type CheckoutState = {
  checkoutSessionId: string;
  checkoutUrl: string | null;
  paymentStatus: string | null;
  checkoutStatus: string | null;
  isAwaitingPaymentConfirmation: boolean;
} | null;

export function toOrderResponse(
  order: OrderResponseSource,
  checkoutState?: CheckoutState,
) {
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
