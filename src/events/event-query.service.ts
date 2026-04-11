import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import {
  toEventDetailResponse,
  toEventSummaryResponse,
} from "./mappers/event-response.mapper";

@Injectable()
export class EventQueryService {
  constructor(private readonly prisma: PrismaService) {}

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

    return events.map((event) => toEventSummaryResponse(event));
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

    return toEventDetailResponse(event);
  }
}
