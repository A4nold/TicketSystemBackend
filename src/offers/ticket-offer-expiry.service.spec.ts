import { describe, expect, it, vi } from "vitest";

import { TicketOfferExpiryService } from "./ticket-offer-expiry.service";

describe("TicketOfferExpiryService", () => {
  it("expires pending offers and notifies attendees", async () => {
    const prisma = {
      ticketOfferRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "offer_1",
            attendeeUserId: "att_1",
            eventId: "event_1",
            ticketTypeId: "tt_1",
            organizerNote: null,
            ticketType: { name: "VIP" },
          },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
      },
    };

    const notificationsService = {
      createUserNotification: vi.fn().mockResolvedValue(undefined),
    };

    const service = new TicketOfferExpiryService(
      prisma as never,
      notificationsService as never,
    );

    const count = await service.sweepExpiredOffers();

    expect(count).toBe(1);
    expect(prisma.ticketOfferRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
    expect(notificationsService.createUserNotification).toHaveBeenCalledTimes(1);
  });
});
