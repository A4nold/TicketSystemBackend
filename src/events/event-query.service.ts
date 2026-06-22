import { Injectable, NotFoundException } from "@nestjs/common";

import { EventPaymentReadinessService } from "./event-payment-readiness.service";
import { PrismaService } from "../prisma/prisma.service";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import {
  toEventDetailResponse,
  toEventSummaryResponse,
} from "./mappers/event-response.mapper";

@Injectable()
export class EventQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPaymentReadinessService: EventPaymentReadinessService,
  ) {}

  async listEvents(query: ListEventsQueryDto) {
    const where = query.status
      ? {
          status: query.status,
        }
      : undefined;

    const events = await this.prisma.event.findMany({
      where,
      orderBy: {
        startsAt: query.sort,
      },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        ticketTypes: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return Promise.all(
      events.map(async (event) =>
        toEventSummaryResponse(
          event,
          await this.eventPaymentReadinessService.getEventPaymentReadinessSummary({
            organizerId: event.organizer.id,
            ticketTypes: event.ticketTypes.map((ticketType) => ({
              price: ticketType.price,
              pricingMode: ticketType.pricingMode ?? "FIXED",
            })),
          }),
        ),
      ),
    );
  }

  async getEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        ticketTypes: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        staffMemberships: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
            scanAttempts: true,
            resaleListings: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with slug "${slug}" was not found.`);
    }

    return toEventDetailResponse(
      event,
      await this.eventPaymentReadinessService.getEventPaymentReadinessSummary({
        organizerId: event.organizer.id,
        ticketTypes: event.ticketTypes.map((ticketType) => ({
          price: ticketType.price,
          pricingMode: ticketType.pricingMode ?? "FIXED",
        })),
      }),
    );
  }
}
