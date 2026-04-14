import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TicketStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ExpireTransferService } from "./expire-transfer.service";
import { TransferTicketRepository } from "./repositories/transfer-ticket.repository";

@Injectable()
export class RemindTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly expireTransferService: ExpireTransferService,
    private readonly transferTicketRepository: TransferTicketRepository,
  ) {}

  async remindTransfer(serialNumber: string, user: AuthenticatedUser) {
    const ticket =
      await this.transferTicketRepository.findTicketForTransferReminder(
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
        `Ticket "${serialNumber}" does not have a pending transfer to remind.`,
      );
    }

    if (pendingTransfer.senderUserId !== user.id) {
      throw new BadRequestException(
        `User "${user.id}" is not the sender of transfer "${pendingTransfer.id}".`,
      );
    }

    if (pendingTransfer.expiresAt < new Date()) {
      await this.expireTransferService.expireOverdueTransferForSerialNumber(
        serialNumber,
      );
      throw new BadRequestException(
        `Transfer "${pendingTransfer.id}" has already expired and cannot be reminded.`,
      );
    }

    if (
      pendingTransfer.reminderSentAt &&
      this.hoursSince(pendingTransfer.reminderSentAt) < 12
    ) {
      throw new BadRequestException(
        `A reminder was already sent recently for ticket "${serialNumber}". Please wait before sending another reminder.`,
      );
    }

    const updatedTransfer = await this.prisma.transferRequest.update({
      where: { id: pendingTransfer.id },
      data: {
        reminderSentAt: new Date(),
      },
    });

    const publicAppUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3001";
    const acceptUrl = `${publicAppUrl}/transfer/accept/${encodeURIComponent(serialNumber)}`;

    if (pendingTransfer.recipientEmail) {
      void this.notificationsService.sendTransferRecipientEmail({
        acceptUrl,
        eventStartsAt: ticket.event.startsAt,
        eventTitle: ticket.event.title,
        recipientEmail: pendingTransfer.recipientEmail,
        senderEmail: user.email,
        serialNumber,
        ticketTypeName: ticket.ticketType.name,
      });
    }

    if (pendingTransfer.recipientUserId) {
      await this.notificationsService.createUserNotification({
        actionUrl: `/transfer/accept/${encodeURIComponent(serialNumber)}`,
        body: `The sender has reminded you about the pending transfer for ${ticket.event.title}.`,
        metadata: {
          serialNumber,
        },
        title: "Transfer reminder",
        type: "TRANSFER_RECEIVED",
        userId: pendingTransfer.recipientUserId,
      });
    }

    await this.notificationsService.createUserNotification({
      actionUrl: `/wallet/${encodeURIComponent(serialNumber)}`,
      body: `A reminder has been sent for your pending transfer to ${ticket.event.title}.`,
      metadata: {
        serialNumber,
      },
      title: "Transfer reminder sent",
      type: "TRANSFER_CREATED",
      userId: user.id,
    });

    return this.toTransferResponse(
      updatedTransfer,
      serialNumber,
      ticket.status,
      ticket.ownershipRevision,
    );
  }

  private toTransferResponse(
    transfer: {
      id: string;
      senderUserId: string;
      recipientUserId: string | null;
      recipientEmail: string | null;
      status: string;
      transferToken: string;
      message: string | null;
      expiresAt: Date;
      reminderSentAt: Date | null;
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
      reminderSentAt: transfer.reminderSentAt,
      acceptedAt: transfer.acceptedAt ?? null,
      cancelledAt: transfer.cancelledAt ?? null,
    };
  }

  private hoursSince(date: Date) {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }
}
