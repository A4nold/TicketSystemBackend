import { Injectable } from "@nestjs/common";
import { ResaleStatus, TransferStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ResaleTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTicketForListingCreation(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        event: true,
        resaleListings: {
          where: {
            status: ResaleStatus.LISTED,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
        },
      },
    });
  }

  findTicketForResalePurchase(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        event: true,
        resaleListings: {
          where: {
            status: ResaleStatus.LISTED,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  findTicketForResaleCancellation(serialNumber: string) {
    return this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        event: true,
        resaleListings: {
          where: {
            status: ResaleStatus.LISTED,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }
}
