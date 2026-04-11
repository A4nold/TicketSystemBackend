import { Injectable } from "@nestjs/common";
import { OwnershipChangeType, Prisma } from "@prisma/client";

@Injectable()
export class TicketOwnershipHistoryService {
  async recordPurchase(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      orderItemId: string;
      revision: number;
      serialNumber: string;
      ticketId: string;
      toUserId: string;
    },
  ) {
    await tx.ticketOwnershipHistory.create({
      data: {
        ticketId: input.ticketId,
        fromUserId: null,
        toUserId: input.toUserId,
        changeType: OwnershipChangeType.PURCHASE,
        revision: input.revision,
        metadata: {
          orderId: input.orderId,
          orderItemId: input.orderItemId,
          serialNumber: input.serialNumber,
        },
      },
    });
  }

  async recordTransferAcceptance(
    tx: Prisma.TransactionClient,
    input: {
      fromUserId: string;
      revision: number;
      serialNumber: string;
      ticketId: string;
      toUserId: string;
      transferRequestId: string;
    },
  ) {
    await tx.ticketOwnershipHistory.createMany({
      data: [
        {
          ticketId: input.ticketId,
          fromUserId: input.fromUserId,
          toUserId: input.toUserId,
          changeType: OwnershipChangeType.TRANSFER_OUT,
          revision: input.revision,
          metadata: {
            transferRequestId: input.transferRequestId,
            serialNumber: input.serialNumber,
          },
        },
        {
          ticketId: input.ticketId,
          fromUserId: input.fromUserId,
          toUserId: input.toUserId,
          changeType: OwnershipChangeType.TRANSFER_IN,
          revision: input.revision,
          metadata: {
            transferRequestId: input.transferRequestId,
            serialNumber: input.serialNumber,
          },
        },
      ],
    });
  }

  async recordResaleListed(
    tx: Prisma.TransactionClient,
    input: {
      fromUserId: string;
      resaleListingId: string;
      revision: number;
      serialNumber: string;
      ticketId: string;
      toUserId: string;
    },
  ) {
    await tx.ticketOwnershipHistory.create({
      data: {
        ticketId: input.ticketId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        changeType: OwnershipChangeType.RESALE_LISTED,
        revision: input.revision,
        metadata: {
          resaleListingId: input.resaleListingId,
          serialNumber: input.serialNumber,
        },
      },
    });
  }

  async recordResalePurchase(
    tx: Prisma.TransactionClient,
    input: {
      fromUserId: string;
      resaleListingId: string;
      revision: number;
      saleReference: string | null;
      serialNumber: string;
      ticketId: string;
      toUserId: string;
    },
  ) {
    await tx.ticketOwnershipHistory.create({
      data: {
        ticketId: input.ticketId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        changeType: OwnershipChangeType.RESALE_PURCHASE,
        revision: input.revision,
        metadata: {
          resaleListingId: input.resaleListingId,
          saleReference: input.saleReference,
          serialNumber: input.serialNumber,
        },
      },
    });
  }
}
