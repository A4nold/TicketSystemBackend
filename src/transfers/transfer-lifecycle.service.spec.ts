import { describe, expect, it, vi } from "vitest";

import { ExpireTransferService } from "./expire-transfer.service";
import { RemindTransferService } from "./remind-transfer.service";

describe("ExpireTransferService", () => {
  it("expires overdue pending transfers and restores ticket status", async () => {
    const updateTransfer = vi.fn().mockResolvedValue(undefined);
    const updateTicket = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      transferRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "transfer_1",
            ticket: {
              id: "ticket_1",
              status: "TRANSFER_PENDING",
            },
          },
        ]),
        update: updateTransfer,
      },
      ticket: {
        update: updateTicket,
      },
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          transferRequest: {
            update: updateTransfer,
          },
          ticket: {
            update: updateTicket,
          },
        }),
      ),
    };

    const service = new ExpireTransferService(prisma as never);

    const expiredCount = await service.expireOverdueTransfersForUser({
      accountType: "ATTENDEE",
      appRoles: ["attendee"],
      email: "ada@student.ie",
      id: "user_1",
      memberships: [],
      platformRoles: [],
      profile: null,
      status: "ACTIVE",
    });

    expect(expiredCount).toBe(1);
    expect(updateTransfer).toHaveBeenCalledWith({
      where: { id: "transfer_1" },
      data: {
        status: "EXPIRED",
      },
    });
    expect(updateTicket).toHaveBeenCalledWith({
      where: { id: "ticket_1" },
      data: {
        status: "ISSUED",
      },
    });
  });
});

describe("RemindTransferService", () => {
  it("records reminder timestamp and notifies the recipient", async () => {
    const prisma = {
      transferRequest: {
        update: vi.fn().mockResolvedValue({
          acceptedAt: null,
          cancelledAt: null,
          expiresAt: new Date("2026-05-02T21:00:00.000Z"),
          id: "transfer_1",
          message: null,
          recipientEmail: "tobi@student.ie",
          recipientUserId: "user_2",
          reminderSentAt: new Date("2026-05-01T12:00:00.000Z"),
          senderUserId: "user_1",
          status: "PENDING",
          transferToken: "token_1",
        }),
      },
    };
    const notificationsService = {
      createUserNotification: vi.fn().mockResolvedValue(undefined),
      sendTransferRecipientEmail: vi.fn().mockResolvedValue(undefined),
    };
    const expireTransferService = {
      expireOverdueTransferForSerialNumber: vi.fn().mockResolvedValue(false),
    };
    const transferTicketRepository = {
      findTicketForTransferReminder: vi.fn().mockResolvedValue({
        currentOwner: {
          email: "ada@student.ie",
        },
        event: {
          startsAt: new Date("2026-05-01T21:00:00.000Z"),
          title: "Campus Neon Takeover",
        },
        ownershipRevision: 1,
        serialNumber: "CNT-GA-0001",
        status: "TRANSFER_PENDING",
        ticketType: {
          name: "General Admission",
        },
        transferRequests: [
          {
            expiresAt: new Date("2026-05-02T21:00:00.000Z"),
            id: "transfer_1",
            recipientEmail: "tobi@student.ie",
            recipientUserId: "user_2",
            reminderSentAt: null,
            senderUserId: "user_1",
            status: "PENDING",
          },
        ],
      }),
    };

    const service = new RemindTransferService(
      prisma as never,
      notificationsService as never,
      expireTransferService as never,
      transferTicketRepository as never,
    );

    const result = await service.remindTransfer("CNT-GA-0001", {
      accountType: "ATTENDEE",
      appRoles: ["attendee"],
      email: "ada@student.ie",
      id: "user_1",
      memberships: [],
      platformRoles: [],
      profile: null,
      status: "ACTIVE",
    });

    expect(prisma.transferRequest.update).toHaveBeenCalledWith({
      where: { id: "transfer_1" },
      data: {
        reminderSentAt: expect.any(Date),
      },
    });
    expect(notificationsService.sendTransferRecipientEmail).toHaveBeenCalled();
    expect(notificationsService.createUserNotification).toHaveBeenCalledTimes(2);
    expect(result.reminderSentAt).toEqual(new Date("2026-05-01T12:00:00.000Z"));
  });
});
