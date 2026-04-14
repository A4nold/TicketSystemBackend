import { describe, expect, it, vi } from "vitest";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateTransferService } from "./create-transfer.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TicketQueryService } from "../tickets/ticket-query.service";

function createAuthenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    accountType: "ATTENDEE",
    appRoles: ["attendee"],
    email: "user@example.com",
    id: "user_1",
    memberships: [],
    platformRoles: [],
    profile: null,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("CreateTransferService", () => {
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
      notifyTransferCreated: vi.fn().mockResolvedValue(undefined),
      sendTransferRecipientEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;
    const transferTicketRepository = {
      findTicketForTransferCreation: prisma.ticket.findUnique,
    };
    const service = new CreateTransferService(
      prisma as never,
      notifications,
      transferTicketRepository as never,
    );

    await service.createTransfer(
      "CNT-GA-0001",
      { recipientEmail: "tobi@student.ie" },
      createAuthenticatedUser({
        email: "ada@student.ie",
        id: "user_1",
      }),
    );

    expect(notifications.sendTransferRecipientEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTitle: "Campus Neon Takeover",
        recipientEmail: "tobi@student.ie",
        senderEmail: "ada@student.ie",
        serialNumber: "CNT-GA-0001",
      }),
    );
    expect(notifications.notifyTransferCreated).toHaveBeenCalledWith({
      eventTitle: "Campus Neon Takeover",
      recipientEmail: "tobi@student.ie",
      recipientUserId: null,
      senderUserId: "user_1",
      serialNumber: "CNT-GA-0001",
    });
  });
});

describe("TicketQueryService transfer inbox queries", () => {
  it("returns pending transfers addressed by recipient user id or recipient email", async () => {
    const prisma = {
      transferRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
            expiresAt: new Date("2026-05-02T10:00:00.000Z"),
            id: "transfer_user_match",
            message: "Sent directly to your account",
            recipientEmail: null,
            recipientUserId: "user_target",
            senderUser: {
              email: "ada@student.ie",
            },
            senderUserId: "user_sender_1",
            status: "PENDING",
            ticket: {
              event: {
                id: "event_1",
                slug: "campus-neon-takeover",
                startsAt: new Date("2026-05-01T21:00:00.000Z"),
                title: "Campus Neon Takeover",
              },
              serialNumber: "CNT-GA-0001",
              ticketType: {
                id: "ticket_type_1",
                name: "General Admission",
              },
            },
          },
          {
            createdAt: new Date("2026-05-01T11:00:00.000Z"),
            expiresAt: new Date("2026-05-02T11:00:00.000Z"),
            id: "transfer_email_match",
            message: null,
            recipientEmail: "organizer@campusnight.ie",
            recipientUserId: null,
            senderUser: {
              email: "ada@student.ie",
            },
            senderUserId: "user_sender_1",
            status: "PENDING",
            ticket: {
              event: {
                id: "event_2",
                slug: "vip-afterparty",
                startsAt: new Date("2026-05-03T22:00:00.000Z"),
                title: "VIP Afterparty",
              },
              serialNumber: "CNT-VIP-0001",
              ticketType: {
                id: "ticket_type_2",
                name: "VIP",
              },
            },
          },
        ]),
      },
    };

    const service = new TicketQueryService(prisma as never);

    const transfers = await service.listIncomingTransfers(
      createAuthenticatedUser({
        email: "organizer@campusnight.ie",
        id: "user_target",
      }),
    );

    expect(prisma.transferRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PENDING",
          OR: [{ recipientUserId: "user_target" }, { recipientEmail: "organizer@campusnight.ie" }],
        },
      }),
    );
    expect(transfers).toHaveLength(2);
    expect(transfers[0].id).toBe("transfer_user_match");
    expect(transfers[1].id).toBe("transfer_email_match");
  });
});
