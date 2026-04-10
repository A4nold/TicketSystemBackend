import { describe, expect, it, vi } from "vitest";

import { NotificationsService } from "../notifications/notifications.service";
import { TransfersService } from "./transfers.service";

describe("TransfersService", () => {
  it("sends a recipient email after creating a transfer", async () => {
    const prisma = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ticket_1",
          serialNumber: "CNT-GA-0001",
          status: "ISSUED",
          currentOwnerId: "user_1",
          currentOwner: {
            email: "ada@student.ie",
          },
          event: {
            slug: "campus-neon-takeover",
            startsAt: new Date("2026-05-01T21:00:00.000Z"),
            title: "Campus Neon Takeover",
          },
          ticketType: {
            name: "General Admission",
          },
          transferRequests: [],
        }),
      },
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          transferRequest: {
            create: vi.fn().mockResolvedValue({
              acceptedAt: null,
              cancelledAt: null,
              expiresAt: new Date("2026-05-02T21:00:00.000Z"),
              id: "transfer_1",
              message: null,
              recipientEmail: "tobi@student.ie",
              recipientUserId: null,
              senderUserId: "user_1",
              status: "PENDING",
              ticketId: "ticket_1",
              transferToken: "transfer_token_1",
            }),
          },
          ticket: {
            update: vi.fn().mockResolvedValue({
              ownershipRevision: 1,
              status: "TRANSFER_PENDING",
            }),
          },
        }),
      ),
    };
    const notifications = {
      sendTransferRecipientEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;
    const service = new TransfersService(prisma as never, notifications);

    await service.createTransfer(
      "CNT-GA-0001",
      { recipientEmail: "tobi@student.ie" },
      {
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "ada@student.ie",
        id: "user_1",
        memberships: [],
        platformRoles: [],
        status: "ACTIVE",
      },
    );

    expect(notifications.sendTransferRecipientEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTitle: "Campus Neon Takeover",
        recipientEmail: "tobi@student.ie",
        senderEmail: "ada@student.ie",
        serialNumber: "CNT-GA-0001",
      }),
    );
  });
});
