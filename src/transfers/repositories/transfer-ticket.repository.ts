import { Injectable } from "@nestjs/common";
import { TransferStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TransferTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTicketForTransferCreation(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        currentOwner: true,
        event: true,
        ticketType: true,
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  findTicketForTransferAcceptance(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        event: true,
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  findTicketForTransferCancellation(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        event: true,
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  findTicketForTransferReminder(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        currentOwner: true,
        event: true,
        ticketType: true,
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }
}
