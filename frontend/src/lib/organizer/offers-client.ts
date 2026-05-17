"use client";

import { apiFetch } from "@/lib/api/client";

export type OrganizerOfferRequest = {
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

export async function listOrganizerOffers(
  eventId: string,
  accessToken: string,
  status: OrganizerOfferRequest["status"] = "PENDING",
) {
  return apiFetch<OrganizerOfferRequest[]>(
    `/api/events/${eventId}/offers`,
    {
      headers: {
        ...(accessToken && accessToken !== "__cookie_auth__" ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
    {
      status,
    },
  );
}

export async function acceptOrganizerOffer(
  offerId: string,
  accessToken: string,
  organizerNote?: string,
) {
  return apiFetch<OrganizerOfferRequest>(`/api/offers/${offerId}/accept`, {
    method: "POST",
    headers: {
      ...(accessToken && accessToken !== "__cookie_auth__" ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizerNote,
    }),
  });
}

export async function rejectOrganizerOffer(
  offerId: string,
  accessToken: string,
  organizerNote?: string,
) {
  return apiFetch<OrganizerOfferRequest>(`/api/offers/${offerId}/reject`, {
    method: "POST",
    headers: {
      ...(accessToken && accessToken !== "__cookie_auth__" ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizerNote,
    }),
  });
}

