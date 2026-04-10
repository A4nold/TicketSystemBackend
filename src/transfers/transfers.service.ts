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
import { AcceptTransferDto } from "./dto/accept-transfer.dto";
import { CancelTransferDto } from "./dto/cancel-transfer.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTransfer(
    serialNumber: string,
    payload: CreateTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        currentOwner: true,
        event: true,
        ticketType: true,
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

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

    if (
      payload.recipientUserId &&
      payload.recipientUserId === user.id
    ) {
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

    return this.toTransferResponse(
      transfer.createdTransfer,
      serialNumber,
      transfer.updatedTicket.status,
      transfer.updatedTicket.ownershipRevision,
    );
  }

  async acceptTransfer(
    serialNumber: string,
    _payload: AcceptTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

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
      throw new NotFoundException(
        `Recipient user "${user.id}" was not found.`,
      );
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

      await tx.ticketOwnershipHistory.createMany({
        data: [
          {
            ticketId: ticket.id,
            fromUserId: ticket.currentOwnerId,
            toUserId: user.id,
            changeType: OwnershipChangeType.TRANSFER_OUT,
            revision: updatedTicket.ownershipRevision,
            metadata: {
              transferRequestId: updatedTransfer.id,
              serialNumber,
            },
          },
          {
            ticketId: ticket.id,
            fromUserId: ticket.currentOwnerId,
            toUserId: user.id,
            changeType: OwnershipChangeType.TRANSFER_IN,
            revision: updatedTicket.ownershipRevision,
            metadata: {
              transferRequestId: updatedTransfer.id,
              serialNumber,
            },
          },
        ],
      });

      return { updatedTransfer, updatedTicket };
    });

    return this.toTransferResponse(
      result.updatedTransfer,
      serialNumber,
      result.updatedTicket.status,
      result.updatedTicket.ownershipRevision,
    );
  }

  async cancelTransfer(
    serialNumber: string,
    _payload: CancelTransferDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { serialNumber },
      include: {
        transferRequests: {
          where: {
            status: TransferStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

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
      ticketId: string;
      status: TransferStatus;
      transferToken: string;
      senderUserId: string;
      recipientUserId: string | null;
      recipientEmail: string | null;
      message: string | null;
      expiresAt: Date;
      acceptedAt: Date | null;
      cancelledAt: Date | null;
    },
    serialNumber: string,
    ticketStatus: TicketStatus,
    ownershipRevision: number,
  ) {
    return {
      id: transfer.id,
      ticketId: transfer.ticketId,
      serialNumber,
      status: transfer.status,
      transferToken: transfer.transferToken,
      senderUserId: transfer.senderUserId,
      recipientUserId: transfer.recipientUserId,
      recipientEmail: transfer.recipientEmail,
      message: transfer.message,
      expiresAt: transfer.expiresAt,
      acceptedAt: transfer.acceptedAt,
      cancelledAt: transfer.cancelledAt,
      ticketStatus,
      ownershipRevision,
    };
  }

  private defaultTransferExpiry() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 3);
    return expiry;
  }

  private generateTransferToken() {
    return `transfer_${Math.random().toString(36).slice(2, 12)}`;
  }

  private generateQrTokenId(serialNumber: string) {
    return `qr_${serialNumber.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`;
  }
}
