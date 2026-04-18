import { describe, expect, it } from "vitest";

import {
  getSortedTickets,
  getTicketStatusMeta,
  groupTicketsByEvent,
} from "@/features/wallet/wallet-model";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";

function buildTicket(overrides: Partial<OwnedTicketSummary>): OwnedTicketSummary {
  return {
    currentOwner: {
      email: "owner@example.com",
      firstName: "Ada",
      id: "user-1",
      lastName: "Lovelace",
    },
    event: {
      id: overrides.event?.id ?? "event-1",
      postEventContent: null,
      resalePolicy: null,
      slug: overrides.event?.slug ?? "campus-neon",
      startsAt: overrides.event?.startsAt ?? "2026-05-01T19:00:00.000Z",
      status: overrides.event?.status ?? "PUBLISHED",
      title: overrides.event?.title ?? "Campus Neon",
    },
    id: overrides.id ?? "ticket-1",
    issuedAt: null,
    ownershipRevision: 1,
    qrTokenId: "qr-1",
    scanSummary: {
      lastScannedAt: null,
      latestOutcome: null,
      totalAttempts: 0,
    },
    serialNumber: overrides.serialNumber ?? "ABC123",
    status: overrides.status ?? "ISSUED",
    ticketType: {
      currency: "EUR",
      id: "type-1",
      name: "General Admission",
      price: "2500",
    },
    usedAt: null,
  };
}

describe("wallet-model", () => {
  it("prioritizes active tickets before used ones", () => {
    const tickets = [
      buildTicket({ serialNumber: "USED1", status: "USED" }),
      buildTicket({ serialNumber: "LIVE1", status: "ISSUED" }),
    ];

    expect(getSortedTickets(tickets).map((ticket) => ticket.serialNumber)).toEqual([
      "LIVE1",
      "USED1",
    ]);
  });

  it("groups tickets by event", () => {
    const tickets = [
      buildTicket({ id: "one", serialNumber: "ONE" }),
      buildTicket({
        event: {
          id: "event-2",
          postEventContent: null,
          resalePolicy: null,
          slug: "afterparty",
          startsAt: "2026-05-03T19:00:00.000Z",
          status: "PUBLISHED",
          title: "Afterparty",
        },
        id: "two",
        serialNumber: "TWO",
      }),
    ];

    expect(groupTicketsByEvent(tickets)).toHaveLength(2);
    expect(getTicketStatusMeta("TRANSFER_PENDING").description).toContain("transfer");
  });
});
