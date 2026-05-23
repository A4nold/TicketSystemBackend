import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CaptureEventShareAnalyticsDto } from "./dto/capture-event-share-analytics.dto";

@Injectable()
export class EventShareAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async capture(eventId: string, payload: CaptureEventShareAnalyticsDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, title: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    await this.prisma.eventShareAnalytics.create({
      data: {
        eventId: event.id,
        eventSlug: event.slug,
        eventName: event.title,
        eventAction: payload.eventAction,
        sourceSurface: payload.sourceSurface,
        sessionId: payload.sessionId ?? null,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return { accepted: true };
  }
}
