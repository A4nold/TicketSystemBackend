import { describe, expect, it, vi } from "vitest";

import { AcceptTransferService } from "./accept-transfer.service";
import { CancelTransferService } from "./cancel-transfer.service";
import { ExpireTransferService } from "./expire-transfer.service";

describe("Transfer ownership audit hardening", () => {
  it("rotates the QR token and increments ownership revision when a transfer is accepted", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: "recipient@student.ie",
          id: "user_2",
        }),
      },
      $transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          transferRequest: {
            update: vi.fn().mockResolvedValue({
              acceptedAt: new Date("2026-05-01T12:00:00.000Z"),
              cancelledAt: null,
              expiresAt: new Date("2026-05-02T12:00:00.000Z"),
              id: "transfer_1",
              message: null,
              recipientEmail: "recipient@student.ie",
              recipientUserId: "user_2",
              reminderSentAt: null,
              senderUserId: "user_1",
              status: "ACCEPTED",
              transferToken: "token_1",
            }),
          },
          ticket: {
            update: vi.fn().mockResolvedValue({
              ownershipRevision: 2,
              qrTokenId: "qr_cnt_ga_0001_rotated",
              status: "ISSUED",
            }),
          },
        }),
      ),
    };
    const notificationsService = {
      notifyTransferAccepted: vi.fn().mockResolvedValue(undefined),
    };
    const ownershipHistory = {
      recordTransferAcceptance: vi.fn().mockResolvedValue(undefined),
    };
    const expireTransferService = {
      expireOverdueTransferForSerialNumber: vi.fn().mockResolvedValue(false),
    };
    const transferTicketRepository = {
      findTicketForTransferAcceptance: vi.fn().mockResolvedValue({
        currentOwnerId: "user_1",
        event: {
          title: "Campus Neon Takeover",
        },
        id: "ticket_1",
        serialNumber: "CNT-GA-0001",
        transferRequests: [
          {
            expiresAt: new Date("2026-05-02T12:00:00.000Z"),
            id: "transfer_1",
            recipientEmail: "recipient@student.ie",
            recipientUserId: null,
            senderUserId: "user_1",
            status: "PENDING",
          },
        ],
      }),
    };

    const service = new AcceptTransferService(
      prisma as never,
      notificationsService as never,
      ownershipHistory as never,
      expireTransferService as never,
      transferTicketRepository as never,
    );

    const result = await service.acceptTransfer(
      "CNT-GA-0001",
      {},
      {
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "recipient@student.ie",
        id: "user_2",
        memberships: [],
        platformRoles: [],
        profile: null,
        status: "ACTIVE",
      },
    );

    expect(result.ownershipRevision).toBe(2);
    expect(ownershipHistory.recordTransferAcceptance).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        revision: 2,
      }),
    );
  });

  it("does not increment ownership revision when a transfer is cancelled", async () => {
    const updateTransfer = vi.fn().mockResolvedValue({
      acceptedAt: null,
      cancelledAt: new Date("2026-05-01T12:00:00.000Z"),
      expiresAt: new Date("2026-05-02T12:00:00.000Z"),
      id: "transfer_1",
      message: null,
      recipientEmail: "recipient@student.ie",
      recipientUserId: null,
      reminderSentAt: null,
      senderUserId: "user_1",
      status: "CANCELLED",
      transferToken: "token_1",
    });
    const updateTicket = vi.fn().mockResolvedValue({
      ownershipRevision: 1,
      status: "ISSUED",
    });
    const prisma = {
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
    const notificationsService = {
      notifyTransferCancelled: vi.fn().mockResolvedValue(undefined),
    };
    const expireTransferService = {
      expireOverdueTransferForSerialNumber: vi.fn().mockResolvedValue(false),
    };
    const transferTicketRepository = {
      findTicketForTransferCancellation: vi.fn().mockResolvedValue({
        event: {
          title: "Campus Neon Takeover",
        },
        id: "ticket_1",
        transferRequests: [
          {
            expiresAt: new Date("2026-05-02T12:00:00.000Z"),
            id: "transfer_1",
            recipientUserId: null,
            senderUserId: "user_1",
          },
        ],
      }),
    };

    const service = new CancelTransferService(
      prisma as never,
      notificationsService as never,
      expireTransferService as never,
      transferTicketRepository as never,
    );

    const result = await service.cancelTransfer(
      "CNT-GA-0001",
      {},
      {
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "sender@student.ie",
        id: "user_1",
        memberships: [],
        platformRoles: [],
        profile: null,
        status: "ACTIVE",
      },
    );

    expect(result.ownershipRevision).toBe(1);
    expect(updateTicket).toHaveBeenCalledWith({
      where: { id: "ticket_1" },
      data: {
        status: "ISSUED",
      },
    });
  });

  it("does not increment ownership revision when an overdue transfer expires", async () => {
    const updateTransfer = vi.fn().mockResolvedValue(undefined);
    const updateTicket = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      transferRequest: {
        findFirst: vi.fn().mockResolvedValue({
          id: "transfer_1",
          ticket: {
            id: "ticket_1",
            status: "TRANSFER_PENDING",
          },
        }),
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

    const expired = await service.expireOverdueTransferForSerialNumber("CNT-GA-0001");

    expect(expired).toBe(true);
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
