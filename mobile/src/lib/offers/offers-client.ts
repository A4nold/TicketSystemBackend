import { apiFetch } from "@/lib/api/client";

export type TicketOfferRequest = {
  attendeeUser: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  attendeeUserId: string;
  checkoutUnlockToken: string | null;
  createdAt: string;
  currency: string;
  eventId: string;
  expiresAt: string;
  id: string;
  offeredPrice: string;
  organizerNote: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  ticketType: {
    id: string;
    name: string;
  };
  ticketTypeId: string;
  updatedAt: string;
};

export async function createTicketOfferRequest(
  eventId: string,
  ticketTypeId: string,
  offeredPrice: string,
  accessToken: string,
) {
  return apiFetch<TicketOfferRequest>(
    `/api/events/${eventId}/ticket-types/${ticketTypeId}/offers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ offeredPrice }),
    },
  );
}

export async function listMyTicketOffers(
  accessToken: string,
  status?: TicketOfferRequest["status"],
) {
  return apiFetch<TicketOfferRequest[]>(
    "/api/offers/mine",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      status,
    },
  );
}
