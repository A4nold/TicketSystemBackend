"use client";

import { apiFetch } from "@/lib/api/client";

export type CreateCheckoutPayload = {
  eventSlug: string;
  items: Array<{
    quantity: number;
    ticketTypeId: string;
  }>;
  paymentProvider?: "STRIPE";
  idempotencyKey?: string;
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
  checkoutSessionId: string | null;
  checkoutStatus: string | null;
  checkoutUrl: string | null;
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
  paymentReference: string | null;
  paymentStatus: string | null;
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

export type OrderResponse = CheckoutOrderResponse;

export async function getCheckoutQuote(
  payload: CreateCheckoutPayload,
  accessToken: string,
) {
  return apiFetch<CheckoutQuoteResponse>(
    "/api/orders/quote",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function createCheckoutOrder(
  payload: CreateCheckoutPayload,
  accessToken: string,
) {
  return apiFetch<CheckoutOrderResponse>(
    "/api/orders/checkout",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function getOrderById(orderId: string, accessToken: string) {
  return apiFetch<OrderResponse>(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
