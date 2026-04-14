import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OwnershipChangeType,
  TicketStatus,
  TransferStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { AcceptTransferDto } from "./dto/accept-transfer.dto";
import { ExpireTransferService } from "./expire-transfer.service";
import { TransferTicketRepository } from "./repositories/transfer-ticket.repository";

@Injectable()
export class AcceptTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly ticketOwnershipHistoryService: TicketOwnershipHistoryService,
    private readonly expireTransferService: ExpireTransferService,
    private readonly transferTicketRepository: TransferTicketRepository,
  ) {}

  async acceptTransfer(
    serialNumber: string,
    _payload: AcceptTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.transferTicketRepository.findTicketForTransferAcceptance(
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
        `Ticket "${serialNumber}" does not have a pending transfer to accept.`,
      );
    }

    if (pendingTransfer.expiresAt < new Date()) {
      await this.expireTransferService.expireOverdueTransferForSerialNumber(
        serialNumber,
      );
      throw new BadRequestException(
        `Transfer "${pendingTransfer.id}" has expired and can no longer be accepted.`,
      );
    }

    if (
      pendingTransfer.recipientUserId &&
      pendingTransfer.recipientUserId !== user.id
    ) {
      throw new BadRequestException(
        `Transfer "${pendingTransfer.id}" is assigned to a different recipient.`,
      );
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!recipient) {
      throw new NotFoundException(`Recipient user "${user.id}" was not found.`);
    }

    if (
      pendingTransfer.recipientEmail &&
      pendingTransfer.recipientEmail !== recipient.email
    ) {
      throw new BadRequestException(
        `Recipient email does not match the transfer target for ticket "${serialNumber}".`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.transferRequest.update({
        where: { id: pendingTransfer.id },
        data: {
          status: TransferStatus.ACCEPTED,
          acceptedAt: new Date(),
          recipientUserId: user.id,
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          currentOwnerId: user.id,
          status: TicketStatus.ISSUED,
          ownershipRevision: {
            increment: 1,
          },
          qrTokenId: this.generateQrTokenId(ticket.serialNumber),
        },
      });

      await this.ticketOwnershipHistoryService.recordTransferAcceptance(tx, {
        fromUserId: ticket.currentOwnerId,
        revision: updatedTicket.ownershipRevision,
        serialNumber,
        ticketId: ticket.id,
        toUserId: user.id,
        transferRequestId: updatedTransfer.id,
      });

      return { updatedTransfer, updatedTicket };
    });

    await this.notificationsService.notifyTransferAccepted({
      eventTitle: ticket.event.title,
      recipientUserId: user.id,
      senderUserId: ticket.currentOwnerId,
      serialNumber,
    });

    return this.toTransferResponse(
      result.updatedTransfer,
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
      reminderSentAt?: Date | null;
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
      reminderSentAt: transfer.reminderSentAt ?? null,
      acceptedAt: transfer.acceptedAt ?? null,
      cancelledAt: transfer.cancelledAt ?? null,
    };
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
  }
}
