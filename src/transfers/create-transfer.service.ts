import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TicketStatus, TransferStatus } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { TransferTicketRepository } from "./repositories/transfer-ticket.repository";

@Injectable()
export class CreateTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly transferTicketRepository: TransferTicketRepository,
  ) {}

  async createTransfer(
    serialNumber: string,
    payload: CreateTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket =
      await this.transferTicketRepository.findTicketForTransferCreation(
        serialNumber,
      );

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with serial number "${serialNumber}" was not found.`,
      );
    }

    if (ticket.currentOwnerId !== user.id) {
      throw new BadRequestException(
        `User "${user.id}" is not the current owner of ticket "${serialNumber}".`,
      );
    }

    if (payload.recipientUserId && payload.recipientUserId === user.id) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" cannot be transferred to the current owner.`,
      );
    }

    if (
      payload.recipientEmail &&
      payload.recipientEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" cannot be transferred to the current owner's email.`,
      );
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" has already been used and cannot be transferred.`,
      );
    }

    if (ticket.status === TicketStatus.RESALE_LISTED) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" is currently listed for resale and cannot be transferred.`,
      );
    }

    if (ticket.transferRequests.length > 0) {
      throw new BadRequestException(
        `Ticket "${serialNumber}" already has a pending transfer request.`,
      );
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      const createdTransfer = await tx.transferRequest.create({
        data: {
          ticketId: ticket.id,
          senderUserId: user.id,
          recipientUserId: payload.recipientUserId,
          recipientEmail: payload.recipientEmail,
          status: TransferStatus.PENDING,
          transferToken: this.generateTransferToken(),
          message: payload.message,
          expiresAt: payload.expiresAt
            ? new Date(payload.expiresAt)
            : this.defaultTransferExpiry(),
        },
      });

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.TRANSFER_PENDING,
        },
      });

      return { createdTransfer, updatedTicket };
    });

    if (payload.recipientEmail) {
      const publicAppUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3001";
      const acceptUrl = `${publicAppUrl}/transfer/accept/${encodeURIComponent(serialNumber)}`;

      void this.notificationsService.sendTransferRecipientEmail({
        acceptUrl,
        eventStartsAt: ticket.event.startsAt,
        eventTitle: ticket.event.title,
        recipientEmail: payload.recipientEmail,
        senderEmail: user.email,
        serialNumber,
        ticketTypeName: ticket.ticketType.name,
      });
    }

    await this.notificationsService.notifyTransferCreated({
      eventTitle: ticket.event.title,
      recipientEmail: payload.recipientEmail ?? null,
      recipientUserId: payload.recipientUserId ?? null,
      senderUserId: user.id,
      serialNumber,
    });

    return this.toTransferResponse(
      transfer.createdTransfer,
      serialNumber,
      transfer.updatedTicket.status,
      transfer.updatedTicket.ownershipRevision,
    );
  }

  private toTransferResponse(
    transfer: {
      id: string;
      ticketId: string;
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

  private defaultTransferExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  private generateTransferToken() {
    return `tr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}
