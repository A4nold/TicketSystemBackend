import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TicketStatus, TransferStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { CancelTransferDto } from "./dto/cancel-transfer.dto";
import { TransferTicketRepository } from "./repositories/transfer-ticket.repository";

@Injectable()
export class CancelTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transferTicketRepository: TransferTicketRepository,
  ) {}

  async cancelTransfer(
    serialNumber: string,
    _payload: CancelTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.transferTicketRepository.findTicketForTransferCancellation(
        serialNumber,
      );

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    const pendingTransfer = ticket.transferRequests[0];

    if (!pendingTransfer) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" does not have a pending transfer to cancel.`,
      );
    }

    if (pendingTransfer.senderUserId !== user.id) {
      throw new BadRequestException(
        `User "${user.id}" is not the sender of transfer "${pendingTransfer.id}".`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cancelledTransfer = await tx.transferRequest.update({
        where: { id: pendingTransfer.id },
        data: {
          status: TransferStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.ISSUED,
        },
      });

      return { cancelledTransfer, updatedTicket };
    });

    return this.toTransferResponse(
      result.cancelledTransfer,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }

  private toTransferResponse(
    transfer: {
      id: string;
      senderUserId: string;
      recipientUserId: string | null;
      recipientEmail: string | null;
      status: TransferStatus;
      transferToken: string;
      message: string | null;
      expiresAt: Date;
      acceptedAt?: Date | null;
      cancelledAt?: Date | null;
    },
    serialNumber: string,
    ticketStatus: TicketStatus,
    ownershipRevision: number,
  ) {
    return {
      id: transfer.id,
      serialNumber,
      ticketStatus,
      ownershipRevision,
      senderUserId: transfer.senderUserId,
      recipientUserId: transfer.recipientUserId,
      recipientEmail: transfer.recipientEmail,
      status: transfer.status,
      transferToken: transfer.transferToken,
      message: transfer.message,
      expiresAt: transfer.expiresAt,
      acceptedAt: transfer.acceptedAt ?? null,
      cancelledAt: transfer.cancelledAt ?? null,
    };
  }
}
