import { Injectable } from "@nestjs/common";
import { TicketStatus } from "@prisma/client";

import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";

type TransactionClient = Parameters<
  TicketOwnershipHistoryService["recordPurchase"]
>[0];

type PaidOrderForIssuance = {
  event: {
    slug: string;
  };
  eventId: string;
  id: string;
  items: Array<{
    id: string;
    quantity: number;
    ticketType: {
      name: string;
    };
    ticketTypeId: string;
  }>;
  tickets: Array<unknown>;
  userId: string;
};

@Injectable()
export class PurchasedTicketIssuanceService {
  constructor(
    private readonly ticketOwnershipHistoryService: TicketOwnershipHistoryService,
  ) {}

  async issuePurchasedTickets(
    tx: TransactionClient,
    order: PaidOrderForIssuance,
    paidAt: Date,
  ) {
    if (order.tickets.length > 0) {
      return;
    }

    const eventCode = this.toEventCode(order.event.slug);

    for (const item of order.items) {
      const existingCount = await tx.ticket.count({
        where: {
          eventId: order.eventId,
          ticketTypeId: item.ticketTypeId,
        },
      });

      for (let index = 0; index < item.quantity; index += 1) {
        const serialNumber = this.generateSerialNumber(
          eventCode,
          item.ticketType.name,
          existingCount + index + 1,
        );

        const ticket = await tx.ticket.create({
          data: {
            eventId: order.eventId,
            ticketTypeId: item.ticketTypeId,
            orderId: order.id,
            currentOwnerId: order.userId,
            status: TicketStatus.ISSUED,
            serialNumber,
            qrTokenId: this.generateQrTokenId(serialNumber),
            ownershipRevision: 1,
            issuedAt: paidAt,
          },
        });

        await this.ticketOwnershipHistoryService.recordPurchase(tx, {
          orderId: order.id,
          orderItemId: item.id,
          revision: 1,
          serialNumber,
          ticketId: ticket.id,
          toUserId: order.userId,
        });
      }
    }
  }

  private toEventCode(slug: string) {
    return slug
      .split("-")
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3)
      .padEnd(3, "X");
  }

  private toTicketTypeCode(name: string) {
    const normalized = name.toUpperCase();

    if (normalized.includes("VIP")) {
      return "VIP";
    }

    if (normalized.includes("GENERAL")) {
      return "GA";
    }

    return normalized
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3)
      .padEnd(2, "X");
  }

  private generateSerialNumber(
    eventCode: string,
    ticketTypeName: string,
    sequence: number,
  ) {
    return `${eventCode}-${this.toTicketTypeCode(ticketTypeName)}-${String(sequence).padStart(4, "0")}`;
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
  }
}
