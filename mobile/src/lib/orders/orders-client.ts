import { apiFetch } from "@/lib/api/client";

export type CreateCheckoutPayload = {
  cancelReturnUrl?: string;
  eventSlug: string;
  idempotencyKey?: string;
  offerIntentId?: string;
  offerRequestId?: string;
  offerUnlockToken?: string;
  items: Array<{
    quantity: number;
    ticketTypeId: string;
  }>;
  paymentProvider?: "STRIPE" | "PAYSTACK";
  successReturnUrl?: string;
};

export type CheckoutQuoteResponse = {
  currency: string;
  event: {
    id: string;
    slug: string;
    startsAt: string;
    title: string;
  };
  feeAmount: string;
  feePolicy: {
    displayName: string;
    fixedAmount: string;
    fixedFeeApplication: "PER_ORDER" | "PER_TICKET";
    model: "BLENDED";
    percentRate: string;
    responsibility: "BUYER" | "ORGANIZER";
  };
  items: Array<{
    currency: string;
    quantity: number;
    ticketTypeId: string;
    ticketTypeName: string;
    totalPrice: string;
    unitPrice: string;
  }>;
  subtotalAmount: string;
  totalAmount: string;
};

export type CheckoutOrderResponse = {
  cancelledAt?: string | null;
  checkoutFlow: "NONE" | "REDIRECT" | "STRIPE_PAYMENT_INTENT";
  checkoutSessionId: string | null;
  checkoutStatus: string | null;
  checkoutUrl: string | null;
  clientSecret: string | null;
  connectedAccountId: string | null;
  currency: string;
  event: {
    id: string;
    slug: string;
    startsAt: string;
    title: string;
  };
  feeAmount: string;
  feePolicy: {
    displayName: string;
    fixedAmount: string;
    fixedFeeApplication: "PER_ORDER" | "PER_TICKET";
    model: "BLENDED";
    percentRate: string;
    responsibility: "BUYER" | "ORGANIZER";
  };
  id: string;
  isAwaitingPaymentConfirmation: boolean;
  idempotencyKey?: string | null;
  items: Array<{
    currency: string;
    quantity: number;
    ticketTypeId: string;
    ticketTypeName: string;
    totalPrice: string;
    unitPrice: string;
  }>;
  paidAt: string | null;
  paymentProvider: string;
  paymentIntentId: string | null;
  paymentReference: string | null;
  paymentStatus: string | null;
  paymentTransactionId: string | null;
  status: string;
  subtotalAmount: string;
  tickets: Array<{
    id: string;
    issuedAt: string | null;
    ownershipRevision: number;
    qrTokenId: string;
    serialNumber: string;
    status: string;
  }>;
  totalAmount: string;
};

export async function getCheckoutQuote(
  payload: CreateCheckoutPayload,
  accessToken: string,
) {
  return apiFetch<CheckoutQuoteResponse>("/api/orders/quote", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function createCheckoutOrder(
  payload: CreateCheckoutPayload,
  accessToken: string,
) {
  return apiFetch<CheckoutOrderResponse>("/api/orders/checkout", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function getOrderById(orderId: string, accessToken: string) {
  return apiFetch<CheckoutOrderResponse>(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getOrderByCheckoutSessionId(
  checkoutSessionId: string,
  accessToken: string,
) {
  return apiFetch<CheckoutOrderResponse>(
    `/api/orders/lookup/checkout-session/${encodeURIComponent(checkoutSessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

export async function getOrderByPaymentIntentId(
  paymentIntentId: string,
  accessToken: string,
) {
  return apiFetch<CheckoutOrderResponse>(
    `/api/orders/lookup/payment-intent/${encodeURIComponent(paymentIntentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}
