import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

const DEFAULT_REMINDER_WINDOW_HOURS = 24;

@Injectable()
export class PreEventReminderSweepService {
  private readonly logger = new Logger(PreEventReminderSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sweepEligibleEvents() {
    const now = new Date();
    const reminderWindowEnd = new Date(
      now.getTime() + DEFAULT_REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const eligibleEvents = await this.prisma.event.findMany({
      where: {
        preEventReminderSentAt: null,
        startsAt: {
          gt: now,
          lte: reminderWindowEnd,
        },
        status: {
          in: ["PUBLISHED", "SALES_CLOSED", "LIVE"],
        },
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
        id: true,
        slug: true,
        startsAt: true,
        preEventReminderSentAt: true,
        status: true,
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
            body: `${event.title} is coming up soon. Open your wallet to keep tickets and entry details ready.`,
            metadata: {
              eventId: event.id,
              eventSlug: event.slug,
              startsAt: event.startsAt.toISOString(),
            },
            title: "Event reminder",
            type: "EVENT_REMINDER" as NotificationType,
            userId: owner.currentOwnerId,
          })),
        });
      }

      await tx.event.update({
        where: { id: event.id },
        data: {
          preEventReminderSentAt: new Date(),
        },
      });
    });

    if (eligibleOwners.length > 0) {
      await this.notificationsService.sendEventReminderPush({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        startsAt: event.startsAt,
        userIds: eligibleOwners.map((owner) => owner.currentOwnerId),
      });
    }

    return true;
  }

  async trySweepEligibleEvents() {
    try {
      await this.sweepEligibleEvents();
    } catch (error) {
      this.logger.error("Pre-event reminder sweep failed.", error);
    }
  }

  private isEligible(event: {
    startsAt: Date;
    preEventReminderSentAt: Date | null;
    status: string;
  }) {
    const now = new Date();
    const reminderWindowEnd = new Date(
      now.getTime() + DEFAULT_REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
    );

    return (
      !event.preEventReminderSentAt &&
      event.startsAt > now &&
      event.startsAt <= reminderWindowEnd &&
      ["PUBLISHED", "SALES_CLOSED", "LIVE"].includes(event.status)
    );
  }
}
