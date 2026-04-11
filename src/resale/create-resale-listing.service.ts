import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ResaleStatus, TicketStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { CreateResaleListingDto } from "./dto/create-resale-listing.dto";
import { toResaleResponse } from "./mappers/resale-response.mapper";
import { ResaleTicketRepository } from "./repositories/resale-ticket.repository";

@Injectable()
export class CreateResaleListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketOwnershipHistoryService: TicketOwnershipHistoryService,
    private readonly resaleTicketRepository: ResaleTicketRepository,
  ) {}

  async createListing(
    serialNumber: string,
    payload: CreateResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.resaleTicketRepository.findTicketForListingCreation(
        serialNumber,
      );

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    if (ticket.currentOwnerId !== user.id) {
      throw new BadRequestException(
        `User "${user.id}" is not the current owner of ticket "${serialNumber}".`,
      );
    }

    if (!ticket.event.allowResale) {
      throw new BadRequestException(
        `Resale is disabled for event "${ticket.event.slug}".`,
      );
    }

    if (ticket.event.resaleStartsAt && new Date() < ticket.event.resaleStartsAt) {
      throw new BadRequestException(
        `Resale has not opened yet for event "${ticket.event.slug}".`,
      );
    }

    if (ticket.event.resaleEndsAt && new Date() > ticket.event.resaleEndsAt) {
      throw new BadRequestException(
        `Resale has already closed for event "${ticket.event.slug}".`,
      );
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" has already been used and cannot be resold.`,
      );
    }

    if (ticket.status === TicketStatus.TRANSFER_PENDING) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" has a pending transfer and cannot be listed for resale.`,
      );
    }

    if (ticket.resaleListings.length > 0 || ticket.status === TicketStatus.RESALE_LISTED) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" is already listed for resale.`,
      );
    }

    if (ticket.transferRequests.length > 0) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" has a pending transfer and cannot be listed for resale.`,
      );
    }

    const askingPrice = new Prisma.Decimal(payload.askingPrice);

    if (
      ticket.event.maxResalePrice &&
      askingPrice.greaterThan(ticket.event.maxResalePrice)
    ) {
      throw new BadRequestException(
        `Asking price exceeds the resale cap for event "${ticket.event.slug}".`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.resaleListing.create({
        data: {
          ticketId: ticket.id,
          sellerUserId: user.id,
          eventId: ticket.eventId,
          askingPrice,
          currency: "EUR",
          status: ResaleStatus.LISTED,
          paymentProvider: "STRIPE",
          saleReference: generateSaleReference(),
          listedAt: new Date(),
          expiresAt: payload.expiresAt
            ? new Date(payload.expiresAt)
            : ticket.event.resaleEndsAt ?? null,
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.RESALE_LISTED,
        },
      });

      await this.ticketOwnershipHistoryService.recordResaleListed(tx, {
        fromUserId: user.id,
        resaleListingId: listing.id,
        revision: updatedTicket.ownershipRevision,
        serialNumber,
        ticketId: ticket.id,
        toUserId: user.id,
      });

      return { listing, updatedTicket };
    });

    return toResaleResponse(
      result.listing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }
}

function generateSaleReference() {
  return `resale_${Math.random().toString(36).slice(2, 12)}`;
}
