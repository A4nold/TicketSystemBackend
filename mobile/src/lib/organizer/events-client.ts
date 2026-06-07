import { apiFetch } from "@/lib/api/client";
import type { AuthMembership } from "@/lib/auth/types";
import { getApiBaseUrl } from "@/lib/config/env";

export type OrganizerRole = "OWNER" | "ADMIN" | "SCANNER";

export type CreateOrganizerEventPayload = {
  allowResale?: boolean;
  coverImageUrl?: string;
  currency?: "EUR" | "NGN";
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
  maxOfferPrice: string | null;
  maxPerOrder: number | null;
  minOfferPrice: string | null;
  name: string;
  offerAutoExpireMinutes: number;
  price: string;
  pricingMode: "FIXED" | "FREE" | "OFFER_RANGE";
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
  currency: string;
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
  currency: string;
  venueName: string | null;
};

export type CreateTicketTypePayload = {
  currency?: string;
  description?: string;
  isActive?: boolean;
  maxOfferPrice?: string;
  maxPerOrder?: number;
  minOfferPrice?: string;
  name: string;
  offerAutoExpireMinutes?: number;
  price?: string;
  pricingMode?: "FIXED" | "FREE" | "OFFER_RANGE";
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

export async function createOrganizerEvent(
  payload: CreateOrganizerEventPayload,
  accessToken: string,
) {
  return apiFetch<OrganizerEventResponse>("/api/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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

export async function acceptOrganizerStaffInvite(eventId: string, accessToken: string) {
  return apiFetch<OrganizerStaffMembership>(`/api/events/${eventId}/staff/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

export async function uploadOrganizerEventHeaderMedia(
  eventId: string,
  asset: {
    fileName?: string | null;
    mimeType?: string | null;
    uri: string;
  },
  accessToken: string,
) {
  const form = new FormData();
  form.append("file", {
    name: asset.fileName ?? `event-header-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
    uri: asset.uri,
  } as unknown as Blob);

  const response = await apiFetch<{ coverImageUrl: string | null; shareImageUrl: string | null }>(
    `/api/events/${eventId}/media/header`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  return {
    coverImageUrl: toClientReachableMediaUrl(response.coverImageUrl),
    shareImageUrl: toClientReachableMediaUrl(response.shareImageUrl),
  };
}

export async function removeOrganizerEventHeaderMedia(
  eventId: string,
  accessToken: string,
) {
  const response = await apiFetch<{ coverImageUrl: string | null; shareImageUrl: string | null }>(
    `/api/events/${eventId}/media/header`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return {
    coverImageUrl: toClientReachableMediaUrl(response.coverImageUrl),
    shareImageUrl: toClientReachableMediaUrl(response.shareImageUrl),
  };
}

function toClientReachableMediaUrl(url: string | null) {
  if (!url) {
    return null;
  }

  const apiBase = getApiBaseUrl();

  if (url.startsWith("/")) {
    return `${apiBase}${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const apiBaseUrl = new URL(apiBase);
      parsed.protocol = apiBaseUrl.protocol;
      parsed.hostname = apiBaseUrl.hostname;
      parsed.port = apiBaseUrl.port;
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
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
