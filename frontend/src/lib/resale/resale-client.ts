import { apiFetch } from "@/lib/api/client";

export type CreateResaleListingPayload = {
  askingPrice: string;
  expiresAt?: string;
};

export type PublicResaleListing = {
  askingPrice: string;
  currency: string;
  event: {
    id: string;
    slug: string;
    startsAt: string;
    title: string;
  };
  expiresAt: string | null;
  id: string;
  listedAt: string | null;
  serialNumber: string;
  status: string;
  ticketType: {
    id: string;
    name: string;
  };
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
  ownershipRevision: number;
  saleReference: string | null;
  sellerUserId: string;
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
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function listPublicResaleListings(eventSlug: string) {
  return apiFetch<PublicResaleListing[]>(
    `/api/resale/events/${encodeURIComponent(eventSlug)}/listings`,
  );
}

export async function buyResaleListing(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<ResaleResponse>(`/api/tickets/${serialNumber}/buy-resale`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}
