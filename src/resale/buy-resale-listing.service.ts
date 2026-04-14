import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ResaleStatus, TicketStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { BuyResaleListingDto } from "./dto/buy-resale-listing.dto";
import { toResaleResponse } from "./mappers/resale-response.mapper";
import { ResaleTicketRepository } from "./repositories/resale-ticket.repository";

@Injectable()
export class BuyResaleListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly ticketOwnershipHistoryService: TicketOwnershipHistoryService,
    private readonly resaleTicketRepository: ResaleTicketRepository,
  ) {}

  async buyListing(
    serialNumber: string,
    _payload: BuyResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.resaleTicketRepository.findTicketForResalePurchase(
        serialNumber,
      );

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    const listing = ticket.resaleListings[0];

    if (!listing) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" does not have an active resale listing.`,
      );
    }

    if (listing.sellerUserId === user.id) {
      throw new BadRequestException(
        `Seller cannot buy their own resale listing for ticket "${serialNumber}".`,
      );
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer user "${user.id}" was not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const soldListing = await tx.resaleListing.update({
        where: { id: listing.id },
        data: {
          status: ResaleStatus.SOLD,
          buyerUserId: user.id,
          soldAt: new Date(),
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          currentOwnerId: user.id,
          status: TicketStatus.ISSUED,
          ownershipRevision: {
            increment: 1,
          },
          qrTokenId: generateQrTokenId(ticket.serialNumber),
        },
      });

      await this.ticketOwnershipHistoryService.recordResalePurchase(tx, {
        fromUserId: listing.sellerUserId,
        resaleListingId: soldListing.id,
        revision: updatedTicket.ownershipRevision,
        saleReference: soldListing.saleReference,
        serialNumber,
        ticketId: ticket.id,
        toUserId: user.id,
      });

      return { soldListing, updatedTicket };
    });

    await this.notificationsService.notifyResaleSold({
      buyerUserId: user.id,
      eventTitle: ticket.event.title,
      sellerUserId: listing.sellerUserId,
      serialNumber,
    });

    return toResaleResponse(
      result.soldListing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }
}

function generateQrTokenId(serialNumber: string) {
  return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;
}
