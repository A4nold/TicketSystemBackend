import { apiFetch } from "@/lib/api/client";

export type CreateCheckoutPayload = {
  cancelReturnUrl?: string;
  eventSlug: string;
  idempotencyKey?: string;
  items: Array<{
    quantity: number;
    ticketTypeId: string;
  }>;
  paymentProvider?: "STRIPE";
  successReturnUrl?: string;
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
