import { RefundStatus } from "@prisma/client";

type RefundSource = {
  id: string;
  orderId: string | null;
  paymentTransactionId: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  amount: { toFixed: (digits: number) => string };
  currency: string;
  reverseTransfer: boolean;
  refundApplicationFee: boolean;
  reason: string | null;
  requestedByUserId: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
};

export function toRefundResponse(refund: RefundSource) {
  return {
    id: refund.id,
    orderId: refund.orderId,
    paymentTransactionId: refund.paymentTransactionId,
    status: refund.status,
    providerRefundId: refund.providerRefundId,
    amount: refund.amount.toFixed(2),
    currency: refund.currency,
    reverseTransfer: refund.reverseTransfer,
    refundApplicationFee: refund.refundApplicationFee,
    reason: refund.reason,
    requestedByUserId: refund.requestedByUserId,
    requestedAt: refund.requestedAt,
    processedAt: refund.processedAt,
    failedAt: refund.failedAt,
    failureReason: refund.failureReason,
    createdAt: refund.createdAt,
  };
}
