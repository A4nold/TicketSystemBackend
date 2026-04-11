import { Injectable, NotFoundException } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { QrTokensService } from "../qr/qr-tokens.service";

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokensService: QrTokensService,
  ) {}

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
}
