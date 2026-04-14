import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PostEventNotificationSweepService {
  private readonly logger = new Logger(PostEventNotificationSweepService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sweepEligibleEvents() {
    const eligibleEvents = await this.prisma.event.findMany({
      where: {
        postEventMessage: {
          not: null,
        },
        postEventPublishedAt: {
          lte: new Date(),
        },
        postEventNotifiedAt: null,
        OR: [
          {
            endsAt: {
              lte: new Date(),
            },
          },
          {
            endsAt: null,
            startsAt: {
              lte: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    for (const event of eligibleEvents) {
      await this.sweepEventById(event.id);
    }
  }

  async sweepEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        endsAt: true,
        id: true,
        postEventMessage: true,
        postEventNotifiedAt: true,
        postEventPublishedAt: true,
        slug: true,
        startsAt: true,
        title: true,
      },
    });

    if (!event || !this.isEligible(event)) {
      return false;
    }

    const eligibleOwners = await this.prisma.ticket.findMany({
      where: {
        eventId: event.id,
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
      },
      distinct: ["currentOwnerId"],
      select: {
        currentOwnerId: true,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      if (eligibleOwners.length > 0) {
        await tx.userNotification.createMany({
          data: eligibleOwners.map((owner) => ({
            actionUrl: `/wallet?eventSlug=${encodeURIComponent(event.slug)}`,
            body: `New post-event content is available for ${event.title}.`,
            metadata: {
              eventId: event.id,
              eventSlug: event.slug,
            },
            title: "Post-event update is live",
            type: "POST_EVENT_PUBLISHED" as NotificationType,
            userId: owner.currentOwnerId,
          })),
        });
      }

      await tx.event.update({
        where: { id: event.id },
        data: {
          postEventNotifiedAt: new Date(),
        },
      });
    });

    return true;
  }

  async trySweepEligibleEvents() {
    try {
      await this.sweepEligibleEvents();
    } catch (error) {
      this.logger.error("Post-event notification sweep failed.", error);
    }
  }

  async trySweepEventById(eventId: string) {
    try {
      await this.sweepEventById(eventId);
    } catch (error) {
      this.logger.error(
        `Post-event notification sweep failed for event "${eventId}".`,
        error,
      );
    }
  }

  private isEligible(event: {
    endsAt: Date | null;
    postEventMessage: string | null;
    postEventNotifiedAt: Date | null;
    postEventPublishedAt: Date | null;
    startsAt: Date;
  }) {
    const eventEndTime = event.endsAt ?? event.startsAt;

    return Boolean(
      event.postEventMessage &&
        event.postEventPublishedAt &&
        event.postEventPublishedAt <= new Date() &&
        !event.postEventNotifiedAt &&
        eventEndTime <= new Date(),
    );
  }
}
