import { Injectable } from "@nestjs/common";
import { TicketStatus, TransferStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExpireTransferService {
  constructor(private readonly prisma: PrismaService) {}

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
        ticket: true,
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
        ticket: true,
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
    ticket: {
      id: string;
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
  }
}
