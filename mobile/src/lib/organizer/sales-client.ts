import { apiFetch } from "@/lib/api/client";

export type OrganizerEventSalesTransaction = {
  createdAt: string;
  currency: string;
  grossAmount: string;
  id: string;
  orderId: string | null;
  organizerNetAmount: string;
  platformFeeAmount: string;
  provider: "STRIPE" | "PAYSTACK" | "MANUAL";
  status: string;
  ticketCount: number;
};

export type OrganizerEventSalesTicketTypeBreakdown = {
  currency: string;
  grossRevenue: string;
  quantitySold: number;
  ticketTypeId: string;
  ticketTypeName: string;
};

export type OrganizerEventSalesResponse = {
  nextCursor: string | null;
  recentTransactions: OrganizerEventSalesTransaction[];
  summary: {
    currency: string;
    estimatedOrganizerEarnings: string;
    grossRevenue: string;
    platformFees: string;
    refundedAmount: string;
    ticketsSold: number;
  };
  ticketTypeBreakdown: OrganizerEventSalesTicketTypeBreakdown[];
};

export async function getOrganizerEventSales(
  eventId: string,
  accessToken: string,
  query?: {
    cursor?: string;
    limit?: number;
  },
) {
  const params = new URLSearchParams();

  if (query?.cursor) {
    params.set("cursor", query.cursor);
  }

  if (query?.limit) {
    params.set("limit", String(query.limit));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<OrganizerEventSalesResponse>(`/api/events/${eventId}/sales${suffix}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
