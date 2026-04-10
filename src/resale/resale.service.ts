import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OwnershipChangeType,
  Prisma,
  ResaleStatus,
  TicketStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { BuyResaleListingDto } from "./dto/buy-resale-listing.dto";
import { CancelResaleListingDto } from "./dto/cancel-resale-listing.dto";
import { CreateResaleListingDto } from "./dto/create-resale-listing.dto";

@Injectable()
export class ResaleService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicListings(eventSlug: string) {
    const listings = await this.prisma.resaleListing.findMany({
      where: {
        status: ResaleStatus.LISTED,
        event: {
          allowResale: true,
          slug: eventSlug,
        },
      },
      orderBy: {
        listedAt: "desc",
      },
      include: {
        event: true,
        ticket: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    return listings.map((listing) => ({
      askingPrice: listing.askingPrice.toString(),
      currency: listing.currency,
      event: {
        id: listing.event.id,
        slug: listing.event.slug,
        startsAt: listing.event.startsAt,
        title: listing.event.title,
      },
      expiresAt: listing.expiresAt,
      id: listing.id,
      listedAt: listing.listedAt,
      serialNumber: listing.ticket.serialNumber,
      status: listing.status,
      ticketType: {
        id: listing.ticket.ticketType.id,
        name: listing.ticket.ticketType.name,
      },
    }));
  }

  async createListing(
    serialNumber: string,
    payload: CreateResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
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
            status: "PENDING",
          },
        },
      },
    });

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
          saleReference: this.generateSaleReference(),
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

      await tx.ticketOwnershipHistory.create({
        data: {
          ticketId: ticket.id,
          fromUserId: user.id,
          toUserId: user.id,
          changeType: OwnershipChangeType.RESALE_LISTED,
          revision: updatedTicket.ownershipRevision,
          metadata: {
            resaleListingId: listing.id,
            serialNumber,
          },
        },
      });

      return { listing, updatedTicket };
    });

    return this.toResponse(
      result.listing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }

  async buyListing(
    serialNumber: string,
    _payload: BuyResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
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
      throw new NotFoundException(
        `Buyer user "${user.id}" was not found.`,
      );
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
          qrTokenId: this.generateQrTokenId(ticket.serialNumber),
        },
      });

      await tx.ticketOwnershipHistory.create({
        data: {
          ticketId: ticket.id,
          fromUserId: listing.sellerUserId,
          toUserId: user.id,
          changeType: OwnershipChangeType.RESALE_PURCHASE,
          revision: updatedTicket.ownershipRevision,
          metadata: {
            resaleListingId: soldListing.id,
            saleReference: soldListing.saleReference,
            serialNumber,
          },
        },
      });

      return { soldListing, updatedTicket };
    });

    return this.toResponse(
      result.soldListing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }

  async cancelListing(
    serialNumber: string,
    _payload: CancelResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
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

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    const listing = ticket.resaleListings[0];

    if (!listing) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" does not have an active resale listing to cancel.`,
      );
    }

    if (listing.sellerUserId !== user.id) {
      throw new BadRequestException(
        `User "${user.id}" is not the seller of ticket "${serialNumber}".`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cancelledListing = await tx.resaleListing.update({
        where: { id: listing.id },
        data: {
          status: ResaleStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.ISSUED,
        },
      });

      return { cancelledListing, updatedTicket };
    });

    return this.toResponse(
      result.cancelledListing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }

  private toResponse(
    listing: {
      id: string;
      ticketId: string;
      eventId: string;
      sellerUserId: string;
      buyerUserId: string | null;
      status: ResaleStatus;
      askingPrice: Prisma.Decimal;
      currency: string;
      saleReference: string | null;
      listedAt: Date | null;
      soldAt: Date | null;
      expiresAt: Date | null;
      cancelledAt: Date | null;
    },
    serialNumber: string,
    ticketStatus: TicketStatus,
    ownershipRevision: number,
  ) {
    return {
      id: listing.id,
      ticketId: listing.ticketId,
      serialNumber,
      eventId: listing.eventId,
      sellerUserId: listing.sellerUserId,
      buyerUserId: listing.buyerUserId,
      status: listing.status,
      askingPrice: listing.askingPrice.toString(),
      currency: listing.currency,
      saleReference: listing.saleReference,
      listedAt: listing.listedAt,
      soldAt: listing.soldAt,
      expiresAt: listing.expiresAt,
      cancelledAt: listing.cancelledAt,
      ticketStatus,
      ownershipRevision,
    };
  }

  private generateSaleReference() {
    return `resale_${Math.random().toString(36).slice(2, 12)}`;
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;
  }
}
