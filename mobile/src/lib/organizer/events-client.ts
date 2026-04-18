import { apiFetch } from "@/lib/api/client";
import type { AuthMembership } from "@/lib/auth/types";

export type OrganizerRole = "OWNER" | "ADMIN" | "SCANNER";

export type CreateOrganizerEventPayload = {
  allowResale?: boolean;
  coverImageUrl?: string;
  description?: string;
  endsAt?: string;
  maxResalePrice?: string;
  minResalePrice?: string;
  postEventCtaLabel?: string;
  postEventCtaUrl?: string;
  postEventMessage?: string;
  postEventPublishedAt?: string;
  resaleRoyaltyPercent?: string;
  resaleEndsAt?: string;
  resaleStartsAt?: string;
  salesEndAt?: string;
  salesStartAt?: string;
  slug?: string;
  startsAt: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  timezone: string;
  title: string;
  venueAddress?: string;
  venueName?: string;
};

export type OrganizerStaffMembership = {
  acceptedAt: string | null;
  id: string;
  invitedAt: string | null;
  role: OrganizerRole;
  user: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
};

export type OrganizerTicketTypeResponse = {
  currency: string;
  description: string | null;
  id: string;
  isActive: boolean;
  maxPerOrder: number | null;
  name: string;
  price: string;
  quantity: number;
  saleEndsAt?: string | null;
  saleStartsAt?: string | null;
};

export type OrganizerEventResponse = {
  allowResale: boolean;
  coverImageUrl: string | null;
  description: string | null;
  endsAt: string | null;
  id: string;
  issuedTicketsCount: number;
  organizer: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  metrics: {
    resaleListings: number;
    scanAttempts: number;
    tickets: number;
  };
  postEventContent: {
    ctaLabel: string | null;
    ctaUrl: string | null;
    message: string | null;
    publishedAt: string | null;
  };
  resalePolicy: {
    endsAt: string | null;
    maxResalePrice: string | null;
    minResalePrice: string | null;
    resaleRoyaltyPercent: string | null;
    startsAt: string | null;
  };
  salesWindow: {
    endsAt: string | null;
    startsAt: string | null;
  };
  slug: string;
  staff: OrganizerStaffMembership[];
  startsAt: string;
  status: string;
  ticketTypes: OrganizerTicketTypeResponse[];
  timezone: string;
  title: string;
  venueAddress: string | null;
  venueName: string | null;
};

export type OrganizerEventSummary = {
  allowResale: boolean;
  coverImageUrl: string | null;
  description: string | null;
  endsAt: string | null;
  id: string;
  issuedTicketsCount: number;
  organizer: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  resaleWindow: {
    endsAt: string | null;
    maxResalePrice: string | null;
    minResalePrice: string | null;
    resaleRoyaltyPercent: string | null;
    startsAt: string | null;
  };
  slug: string;
  startsAt: string;
  status: string;
  ticketTypes: OrganizerTicketTypeResponse[];
  timezone: string;
  title: string;
  venueAddress: string | null;
  venueName: string | null;
};

export type CreateTicketTypePayload = {
  currency?: string;
  description?: string;
  isActive?: boolean;
  maxPerOrder?: number;
  name: string;
  price: string;
  quantity: number;
  saleEndsAt?: string;
  saleStartsAt?: string;
  sortOrder?: number;
};

export async function listOrganizerEvents(accessToken: string) {
  return apiFetch<OrganizerEventSummary[]>(
    "/api/events",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      sort: "desc",
    },
  );
}

export async function getOrganizerEventBySlug(slug: string, accessToken: string) {
  return apiFetch<OrganizerEventResponse>(`/api/events/${slug}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateOrganizerEvent(
  eventId: string,
  payload: Partial<CreateOrganizerEventPayload>,
  accessToken: string,
) {
  return apiFetch<OrganizerEventResponse>(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function createOrganizerTicketType(
  eventId: string,
  payload: CreateTicketTypePayload,
  accessToken: string,
) {
  return apiFetch<OrganizerTicketTypeResponse>(`/api/events/${eventId}/ticket-types`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateOrganizerTicketType(
  eventId: string,
  ticketTypeId: string,
  payload: Partial<CreateTicketTypePayload>,
  accessToken: string,
) {
  return apiFetch<OrganizerTicketTypeResponse>(
    `/api/events/${eventId}/ticket-types/${ticketTypeId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function listOrganizerStaff(eventId: string, accessToken: string) {
  return apiFetch<OrganizerStaffMembership[]>(`/api/events/${eventId}/staff`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function inviteOrganizerStaff(
  eventId: string,
  payload: {
    email: string;
    role: "ADMIN" | "SCANNER";
  },
  accessToken: string,
) {
  return apiFetch<OrganizerStaffMembership>(`/api/events/${eventId}/staff/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateOrganizerStaffRole(
  eventId: string,
  membershipId: string,
  payload: {
    role: "ADMIN" | "SCANNER";
  },
  accessToken: string,
) {
  return apiFetch<OrganizerStaffMembership>(`/api/events/${eventId}/staff/${membershipId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function revokeOrganizerStaff(
  eventId: string,
  membershipId: string,
  accessToken: string,
) {
  return apiFetch<OrganizerStaffMembership>(
    `/api/events/${eventId}/staff/${membershipId}/revoke`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
}

export function getOrganizerManageableEventIds(memberships: AuthMembership[]) {
  return memberships
    .filter(
      (membership) =>
        Boolean(membership.acceptedAt) &&
        (membership.role === "OWNER" || membership.role === "ADMIN"),
    )
    .map((membership) => membership.eventId);
}
