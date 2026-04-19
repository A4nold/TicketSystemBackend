import { Injectable } from "@nestjs/common";
import { TicketStatus, TransferStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExpireTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async expireOverdueTransfersForUser(user: AuthenticatedUser) {
    const overdueTransfers = await this.prisma.transferRequest.findMany({
      where: {
        status: TransferStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
        OR: [
          { senderUserId: user.id },
          { recipientUserId: user.id },
          { recipientEmail: user.email },
        ],
      },
      include: {
        ticket: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    await Promise.all(
      overdueTransfers.map((transfer) => this.expireTransferRecord(transfer)),
    );

    return overdueTransfers.length;
  }

  async expireOverdueTransferForSerialNumber(serialNumber: string) {
    const transfer = await this.prisma.transferRequest.findFirst({
      where: {
        status: TransferStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
        ticket: {
          serialNumber,
        },
      },
      include: {
        ticket: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return false;
    }

    await this.expireTransferRecord(transfer);
    return true;
  }

  private async expireTransferRecord(transfer: {
    id: string;
    recipientUserId: string | null;
    senderUserId: string;
    ticket: {
      event: {
        title: string;
      };
      id: string;
      serialNumber: string;
      status: TicketStatus;
    };
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.transferRequest.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.EXPIRED,
        },
      });

      if (transfer.ticket.status === TicketStatus.TRANSFER_PENDING) {
        await tx.ticket.update({
          where: { id: transfer.ticket.id },
          data: {
            status: TicketStatus.ISSUED,
          },
        });
      }
    });

    await this.notificationsService.notifyTransferExpired({
      eventTitle: transfer.ticket.event.title,
      recipientUserId: transfer.recipientUserId,
      senderUserId: transfer.senderUserId,
      serialNumber: transfer.ticket.serialNumber,
    });
  }
}
