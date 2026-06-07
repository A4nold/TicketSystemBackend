import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TicketStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
  ListEventAttendeesQueryDto,
  type EventAttendeeCheckInStatus,
  type EventAttendeeState,
} from "./dto/list-event-attendees-query.dto";

function toUserResponse(user: {
  email: string;
  id: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}) {
  return {
    email: user.email,
    firstName: user.profile?.firstName ?? null,
    id: user.id,
    lastName: user.profile?.lastName ?? null,
  };
}

@Injectable()
export class EventAttendeesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listEventAttendees(
    eventId: string,
    query: ListEventAttendeesQueryDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    const normalizedSearch = query.search?.trim();
    const where = this.buildWhere(eventId, query, normalizedSearch);
    const limit = query.limit ?? 20;
    const take = limit + 1;

    const [totalCount, checkedInCount, refundedCount, activeCount, tickets] =
      await Promise.all([
        this.prisma.ticket.count({ where }),
        this.prisma.ticket.count({
          where: {
            ...where,
            OR: [{ usedAt: { not: null } }, { status: TicketStatus.USED }],
          },
        }),
        this.prisma.ticket.count({
          where: {
            ...where,
            status: TicketStatus.REFUNDED,
          },
        }),
        this.prisma.ticket.count({
          where: {
            ...where,
            status: {
              in: [TicketStatus.ISSUED, TicketStatus.USED],
            },
          },
        }),
        this.prisma.ticket.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          cursor: query.cursor ? { id: query.cursor } : undefined,
          skip: query.cursor ? 1 : 0,
          take,
          include: {
            currentOwner: {
              include: {
                profile: true,
              },
            },
            order: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            ticketType: true,
          },
        }),
      ]);

    const hasMore = tickets.length > limit;
    const pageItems = hasMore ? tickets.slice(0, limit) : tickets;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return {
      items: pageItems.map((ticket) => ({
        checkedIn: Boolean(ticket.usedAt) || ticket.status === TicketStatus.USED,
        checkedInAt: ticket.usedAt ?? null,
        holder: toUserResponse(ticket.currentOwner),
        purchaseDate: ticket.order.paidAt ?? ticket.order.createdAt,
        purchaser: toUserResponse(ticket.order.user),
        serialNumber: ticket.serialNumber,
        ticketId: ticket.id,
        ticketStatus: ticket.status,
        ticketType: {
          id: ticket.ticketType.id,
          name: ticket.ticketType.name,
        },
      })),
      nextCursor,
      summary: {
        activeCount,
        checkedInCount,
        refundedCount,
        totalCount,
      },
    };
  }

  private buildWhere(
    eventId: string,
    query: ListEventAttendeesQueryDto,
    search?: string,
  ): Prisma.TicketWhereInput {
    const baseWhere: Prisma.TicketWhereInput = {
      eventId,
      ...(query.ticketStatus ? { status: query.ticketStatus } : {}),
      ...(query.ticketTypeId ? { ticketTypeId: query.ticketTypeId } : {}),
      ...this.buildCheckInWhere(query.checkInStatus),
      ...this.buildStateWhere(query.state),
    };

    if (!search) {
      return baseWhere;
    }

    return {
      ...baseWhere,
      OR: [
        {
          serialNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          ticketType: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          currentOwner: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          currentOwner: {
            profile: {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          currentOwner: {
            profile: {
              lastName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          order: {
            user: {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          order: {
            user: {
              profile: {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
        {
          order: {
            user: {
              profile: {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      ],
    };
  }

  private buildCheckInWhere(
    checkInStatus?: EventAttendeeCheckInStatus,
  ): Prisma.TicketWhereInput {
    if (checkInStatus === "CHECKED_IN") {
      return {
        OR: [{ usedAt: { not: null } }, { status: TicketStatus.USED }],
      };
    }

    if (checkInStatus === "NOT_CHECKED_IN") {
      return {
        usedAt: null,
        status: {
          not: TicketStatus.USED,
        },
      };
    }

    return {};
  }

  private buildStateWhere(state?: EventAttendeeState): Prisma.TicketWhereInput {
    if (state === "ACTIVE") {
      return {
        status: {
          in: [TicketStatus.ISSUED, TicketStatus.USED],
        },
      };
    }

    if (state === "REFUNDED") {
      return {
        status: TicketStatus.REFUNDED,
      };
    }

    return {};
  }
}
