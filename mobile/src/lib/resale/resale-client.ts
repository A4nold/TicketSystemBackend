import { apiFetch } from "@/lib/api/client";

export type CreateResaleListingPayload = {
  askingPrice: string;
  expiresAt?: string;
};

export type ResaleResponse = {
  askingPrice: string;
  buyerUserId: string | null;
  cancelledAt: string | null;
  currency: string;
  eventId: string;
  expiresAt: string | null;
  id: string;
  listedAt: string | null;
  organizerRoyaltyAmount: string | null;
  ownershipRevision: number;
  saleReference: string | null;
  sellerUserId: string;
  sellerNetAmount: string | null;
  serialNumber: string;
  soldAt: string | null;
  status: string;
  ticketId: string;
  ticketStatus: string;
};

export async function createResaleListing(
  serialNumber: string,
  payload: CreateResaleListingPayload,
  accessToken: string,
) {
  return apiFetch<ResaleResponse>(`/api/me/tickets/${serialNumber}/resale`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function cancelResaleListing(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<ResaleResponse>(`/api/me/tickets/${serialNumber}/cancel-resale`, {
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
