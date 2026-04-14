import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ResaleStatus, TicketStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CancelResaleListingDto } from "./dto/cancel-resale-listing.dto";
import { toResaleResponse } from "./mappers/resale-response.mapper";
import { ResaleTicketRepository } from "./repositories/resale-ticket.repository";

@Injectable()
export class CancelResaleListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly resaleTicketRepository: ResaleTicketRepository,
  ) {}

  async cancelListing(
    serialNumber: string,
    _payload: CancelResaleListingDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.resaleTicketRepository.findTicketForResaleCancellation(
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

    await this.notificationsService.notifyResaleCancelled({
      eventTitle: ticket.event.title,
      sellerUserId: user.id,
      serialNumber,
    });

    return toResaleResponse(
      result.cancelledListing,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }
}
