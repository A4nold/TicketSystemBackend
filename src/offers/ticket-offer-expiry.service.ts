import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class TicketOfferExpiryService {
  private readonly logger = new Logger(TicketOfferExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sweepExpiredOffers() {
    const now = new Date();
    const expiredOffers = await this.prisma.ticketOfferRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lte: now,
        },
      },
      include: {
        ticketType: true,
      },
      take: 200,
      orderBy: {
        expiresAt: "asc",
      },
    });

    for (const offer of expiredOffers) {
      await this.prisma.ticketOfferRequest.update({
        where: {
          id: offer.id,
        },
        data: {
          status: "EXPIRED",
          reviewedAt: now,
          organizerNote: offer.organizerNote ?? "Request expired before review.",
        },
      });

      await this.notificationsService.createUserNotification({
        actionUrl: "/wallet?tab=notifications",
        body: `Your offer request for ${offer.ticketType.name} expired before organizer review.`,
        metadata: {
          offerRequestId: offer.id,
          ticketTypeId: offer.ticketTypeId,
        },
        title: "Offer request expired",
        type: NotificationType.OFFER_REQUEST_EXPIRED,
        userId: offer.attendeeUserId,
      });
    }

    return expiredOffers.length;
  }

  async trySweepExpiredOffers() {
    try {
      return await this.sweepExpiredOffers();
    } catch (error) {
      this.logger.error("Ticket offer expiry sweep failed.", error);
      return 0;
    }
  }
}
