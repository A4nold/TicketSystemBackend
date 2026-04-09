import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { QrTokensService } from "../qr/qr-tokens.service";
import { ListMyTicketsQueryDto } from "./dto/list-my-tickets-query.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokensService: QrTokensService,
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
      include: {
        event: true,
        ticketType: true,
        currentOwner: {
          include: {
            profile: true,
          },
        },
        scanAttempts: {
          orderBy: {
            scannedAt: "desc",
          },
        },
      },
    });

    return tickets.map((ticket) => this.toTicketSummaryResponse(ticket));
  }

  async listMyTickets(query: ListMyTicketsQueryDto, user: AuthenticatedUser) {
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
      include: this.ticketSummaryInclude(),
    });

    return tickets.map((ticket) => this.toTicketSummaryResponse(ticket));
  }

  async getTicketBySerialNumber(serialNumber: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: this.ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    return this.toTicketDetailResponse(ticket);
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
      include: this.ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found for event "${eventId}".`,
      );
    }

    return this.toTicketDetailResponse(ticket);
  }

  async getMyTicketBySerialNumber(
    serialNumber: string,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        serialNumber,
        currentOwnerId: user.id,
      },
      include: this.ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException(
        `Owned ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    return this.toTicketDetailResponse(ticket);
  }

  async getMyTicketQrPayload(
    serialNumber: string,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        serialNumber,
        currentOwnerId: user.id,
      },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Owned ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    const { signedToken, expiresAt } = this.qrTokensService.signTicketToken({
      sub: ticket.id,
      qrTokenId: ticket.qrTokenId,
      ownershipRevision: ticket.ownershipRevision,
      serialNumber: ticket.serialNumber,
      eventId: ticket.eventId,
      eventSlug: ticket.event.slug,
    });

    return {
      serialNumber: ticket.serialNumber,
      qrTokenId: ticket.qrTokenId,
      ownershipRevision: ticket.ownershipRevision,
      eventId: ticket.eventId,
      eventSlug: ticket.event.slug,
      signedToken,
      tokenType: "JWT",
      expiresAt,
      generatedAt: new Date(),
    };
  }

  private ticketSummaryInclude() {
    return {
      event: true,
      ticketType: true,
      currentOwner: {
        include: {
          profile: true,
        },
      },
      scanAttempts: {
        orderBy: {
          scannedAt: "desc" as const,
        },
      },
    };
  }

  private ticketDetailInclude() {
    return {
      ...this.ticketSummaryInclude(),
      transferRequests: {
        orderBy: {
          createdAt: "desc" as const,
        },
      },
      resaleListings: {
        orderBy: {
          createdAt: "desc" as const,
        },
      },
      scanAttempts: {
        orderBy: {
          scannedAt: "desc" as const,
        },
        include: {
          scanSession: true,
          scannedByUser: true,
        },
      },
      ownershipHistory: {
        orderBy: {
          createdAt: "asc" as const,
        },
        include: {
          fromUser: true,
          toUser: true,
        },
      },
    };
  }

  private toTicketSummaryResponse(ticket: {
    id: string;
    serialNumber: string;
    qrTokenId: string;
    status: string;
    ownershipRevision: number;
    issuedAt: Date | null;
    usedAt: Date | null;
    event: {
      id: string;
      slug: string;
      title: string;
      status: string;
      startsAt: Date;
    };
    ticketType: {
      id: string;
      name: string;
      price: Prisma.Decimal;
      currency: string;
    };
    currentOwner: {
      id: string;
      email: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
    scanAttempts: Array<{
      outcome: string;
      scannedAt: Date;
    }>;
  }) {
    return {
      id: ticket.id,
      serialNumber: ticket.serialNumber,
      qrTokenId: ticket.qrTokenId,
      status: ticket.status,
      ownershipRevision: ticket.ownershipRevision,
      issuedAt: ticket.issuedAt,
      usedAt: ticket.usedAt,
      event: {
        id: ticket.event.id,
        slug: ticket.event.slug,
        title: ticket.event.title,
        status: ticket.event.status,
        startsAt: ticket.event.startsAt,
      },
      ticketType: {
        id: ticket.ticketType.id,
        name: ticket.ticketType.name,
        price: ticket.ticketType.price.toFixed(2),
        currency: ticket.ticketType.currency,
      },
      currentOwner: {
        id: ticket.currentOwner.id,
        email: ticket.currentOwner.email,
        firstName: ticket.currentOwner.profile?.firstName ?? null,
        lastName: ticket.currentOwner.profile?.lastName ?? null,
      },
      scanSummary: {
        totalAttempts: ticket.scanAttempts.length,
        latestOutcome: ticket.scanAttempts[0]?.outcome ?? null,
        lastScannedAt: ticket.scanAttempts[0]?.scannedAt ?? null,
      },
    };
  }

  private toTicketDetailResponse(ticket: {
    reservedUntil: Date | null;
    cancelledAt: Date | null;
    refundedAt: Date | null;
    resaleListings: Array<{
      id: string;
      status: string;
      askingPrice: Prisma.Decimal;
      currency: string;
      createdAt: Date;
      listedAt: Date | null;
      soldAt: Date | null;
      cancelledAt: Date | null;
    }>;
    scanAttempts: Array<{
      outcome: string;
      reasonCode: string | null;
      scannedAt: Date;
      scannedByUser: {
        email: string;
      } | null;
      scanSession: {
        deviceLabel: string | null;
        mode: string;
      } | null;
    }>;
    ownershipHistory: Array<{
      changeType: string;
      revision: number;
      fromUser: {
        email: string;
      } | null;
      toUser: {
        email: string;
      } | null;
      createdAt: Date;
    }>;
    transferRequests: Array<{
      id: string;
      status: string;
      recipientEmail: string | null;
      createdAt: Date;
      acceptedAt: Date | null;
      cancelledAt: Date | null;
      expiresAt: Date;
    }>;
  } & Parameters<TicketsService["toTicketSummaryResponse"]>[0]) {
    const latestTransfer = ticket.transferRequests[0] ?? null;
    const latestResaleListing = ticket.resaleListings[0] ?? null;

    return {
      ...this.toTicketSummaryResponse(ticket),
      reservedUntil: ticket.reservedUntil,
      cancelledAt: ticket.cancelledAt,
      refundedAt: ticket.refundedAt,
      latestTransfer: latestTransfer
        ? {
            id: latestTransfer.id,
            status: latestTransfer.status,
            recipientEmail: latestTransfer.recipientEmail,
            expiresAt: latestTransfer.expiresAt,
            acceptedAt: latestTransfer.acceptedAt,
          }
        : null,
      latestResaleListing: latestResaleListing
        ? {
            id: latestResaleListing.id,
            status: latestResaleListing.status,
            askingPrice: latestResaleListing.askingPrice.toFixed(2),
            currency: latestResaleListing.currency,
            listedAt: latestResaleListing.listedAt,
            soldAt: latestResaleListing.soldAt,
          }
        : null,
      ownershipHistory: ticket.ownershipHistory.map((historyItem) => ({
        changeType: historyItem.changeType,
        revision: historyItem.revision,
        fromEmail: historyItem.fromUser?.email ?? null,
        toEmail: historyItem.toUser?.email ?? null,
        createdAt: historyItem.createdAt,
      })),
      transferHistory: ticket.transferRequests.map((transfer) => ({
        id: transfer.id,
        status: transfer.status,
        recipientEmail: transfer.recipientEmail,
        createdAt: transfer.createdAt,
        acceptedAt: transfer.acceptedAt,
        cancelledAt: transfer.cancelledAt,
      })),
      resaleHistory: ticket.resaleListings.map((listing) => ({
        id: listing.id,
        status: listing.status,
        askingPrice: listing.askingPrice.toFixed(2),
        currency: listing.currency,
        createdAt: listing.createdAt,
        listedAt: listing.listedAt,
        soldAt: listing.soldAt,
        cancelledAt: listing.cancelledAt,
      })),
      scanAttempts: ticket.scanAttempts.map((attempt) => ({
        outcome: attempt.outcome,
        reasonCode: attempt.reasonCode,
        scannedAt: attempt.scannedAt,
        deviceLabel: attempt.scanSession?.deviceLabel ?? null,
        mode: attempt.scanSession?.mode ?? null,
        scannedByEmail: attempt.scannedByUser?.email ?? null,
      })),
    };
  }
}
