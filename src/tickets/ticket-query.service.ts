import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { PostEventNotificationSweepService } from "../notifications/post-event-notification-sweep.service";
import { TransfersService } from "../transfers/transfers.service";
import { ListMyTicketsQueryDto } from "./dto/list-my-tickets-query.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import {
  toTicketDetailResponse,
  toTicketSummaryResponse,
} from "./mappers/ticket-response.mapper";
import { ticketDetailInclude, ticketSummaryInclude } from "./queries/ticket.include";

@Injectable()
export class TicketQueryService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly transfersService?: TransfersService,
    @Optional()
    private readonly postEventNotificationSweepService?: PostEventNotificationSweepService,
  ) {}

  async listTickets(query: ListTicketsQueryDto) {
    const where: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventSlug
        ? {
            event: {
              slug: query.eventSlug,
            },
          }
        : {}),
      ...(query.ownerEmail
        ? {
            currentOwner: {
              email: query.ownerEmail,
            },
          }
        : {}),
    };

    const tickets = await this.prisma.ticket.findMany({
      where,
      orderBy: {
        createdAt: query.sort,
      },
      include: ticketSummaryInclude(),
    });

    return tickets.map((ticket) => toTicketSummaryResponse(ticket));
  }

  async listMyTickets(query: ListMyTicketsQueryDto, user: AuthenticatedUser) {
    await this.transfersService?.expireOverdueTransfersForUser(user);
    await this.postEventNotificationSweepService?.trySweepEligibleEvents();

    const tickets = await this.prisma.ticket.findMany({
      where: {
        currentOwnerId: user.id,
        ...(query.status ? { status: query.status } : {}),
        ...(query.eventSlug
          ? {
              event: {
                slug: query.eventSlug,
              },
            }
          : {}),
      },
      orderBy: {
        event: {
          startsAt: query.sort,
        },
      },
      include: ticketSummaryInclude(),
    });

    return tickets.map((ticket) => toTicketSummaryResponse(ticket));
  }

  async getTicketBySerialNumber(serialNumber: string) {
    await this.transfersService?.expireOverdueTransferForSerialNumber(
      serialNumber,
    );

    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    return toTicketDetailResponse(ticket);
  }

  async getOperationalTicketBySerialNumber(
    eventId: string,
    serialNumber: string,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        eventId,
        serialNumber,
      },
      include: ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found for event "${eventId}".`,
      );
    }

    return toTicketDetailResponse(ticket);
  }

  async getMyTicketBySerialNumber(
    serialNumber: string,
    user: AuthenticatedUser,
  ) {
    await this.transfersService?.expireOverdueTransfersForUser(user);
    await this.transfersService?.expireOverdueTransferForSerialNumber(
      serialNumber,
    );
    await this.postEventNotificationSweepService?.trySweepEligibleEvents();

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        serialNumber,
        currentOwnerId: user.id,
      },
      include: ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Owned ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    return toTicketDetailResponse(ticket);
  }

  async listIncomingTransfers(user: AuthenticatedUser) {
    await this.transfersService?.expireOverdueTransfersForUser(user);

    const transfers = await this.prisma.transferRequest.findMany({
      where: {
        status: "PENDING",
        OR: [{ recipientUserId: user.id }, { recipientEmail: user.email }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        senderUser: true,
        ticket: {
          include: {
            event: true,
            ticketType: true,
          },
        },
      },
    });

    return transfers.map((transfer) => ({
      event: {
        id: transfer.ticket.event.id,
        slug: transfer.ticket.event.slug,
        startsAt: transfer.ticket.event.startsAt,
        title: transfer.ticket.event.title,
      },
      expiresAt: transfer.expiresAt,
      id: transfer.id,
      isExpired: transfer.expiresAt < new Date(),
      message: transfer.message,
      reminderSentAt: transfer.reminderSentAt ?? null,
      senderEmail: transfer.senderUser.email,
      senderUserId: transfer.senderUserId,
      serialNumber: transfer.ticket.serialNumber,
      status: transfer.status,
      ticketType: {
        id: transfer.ticket.ticketType.id,
        name: transfer.ticket.ticketType.name,
      },
    }));
  }
}
