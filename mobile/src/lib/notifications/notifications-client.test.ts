import { describe, expect, it } from "vitest";

import { getInAppPathFromNotification, type WalletNotification } from "@/lib/notifications/notifications-client";

function createNotification(actionUrl: string | null): WalletNotification {
  return {
    actionUrl,
    body: "body",
    createdAt: "2026-05-17T12:00:00.000Z",
    id: "notif_1",
    metadata: null,
    readAt: null,
    status: "UNREAD",
    title: "title",
    type: "OFFER_REQUEST_ACCEPTED",
  };
}

describe("getInAppPathFromNotification", () => {
  it("maps wallet detail links to ticket routes", () => {
    expect(getInAppPathFromNotification(createNotification("/wallet/CNT-GA-0002"))).toBe(
      "/tickets/CNT-GA-0002",
    );
  });

  it("passes through checkout-offer deep links", () => {
    const path = "/checkout/start?eventSlug=campus-neon&ticketTypeId=tt_1&quantity=1&offerRequestId=of_1&offerUnlockToken=tok_1";
    expect(getInAppPathFromNotification(createNotification(path))).toBe(path);
  });

  it("passes through organizer-offer deep links", () => {
    const path = "/organizer?eventId=event_1&tab=offers";
    expect(getInAppPathFromNotification(createNotification(path))).toBe(path);
  });
});
