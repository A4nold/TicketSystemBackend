import { apiFetch } from "@/lib/api/client";

export type OrganizerEventAttendeeUser = {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
};

export type OrganizerEventAttendee = {
  checkedIn: boolean;
  checkedInAt: string | null;
  holder: OrganizerEventAttendeeUser;
  purchaseDate: string;
  purchaser: OrganizerEventAttendeeUser;
  serialNumber: string;
  ticketId: string;
  ticketStatus: string;
  ticketType: {
    id: string;
    name: string;
  };
};

export type OrganizerEventAttendeesResponse = {
  items: OrganizerEventAttendee[];
  nextCursor: string | null;
  summary: {
    activeCount: number;
    checkedInCount: number;
    refundedCount: number;
    totalCount: number;
  };
};

export async function listOrganizerEventAttendees(
  eventId: string,
  accessToken: string,
  query?: {
    checkInStatus?: "CHECKED_IN" | "NOT_CHECKED_IN";
    cursor?: string;
    limit?: number;
    search?: string;
    state?: "ACTIVE" | "REFUNDED";
    ticketStatus?: string;
    ticketTypeId?: string;
  },
) {
  return apiFetch<OrganizerEventAttendeesResponse>(
    `/api/events/${eventId}/attendees`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      checkInStatus: query?.checkInStatus,
      cursor: query?.cursor,
      limit: query?.limit?.toString(),
      search: query?.search?.trim() || undefined,
      state: query?.state,
      ticketStatus: query?.ticketStatus,
      ticketTypeId: query?.ticketTypeId,
    },
  );
}
