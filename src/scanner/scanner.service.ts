import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ScanMode, ScanOutcome, TicketStatus } from "@prisma/client";

import {
  AuthenticatedScannerMembership,
  AuthenticatedUser,
} from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { QrTokensService } from "../qr/qr-tokens.service";
import { SyncScanAttemptsDto } from "./dto/sync-scan-attempts.dto";
import { ValidateScanDto } from "./dto/validate-scan.dto";

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokensService: QrTokensService,
  ) {}

  async getManifest(
    eventId: string,
    _user: AuthenticatedUser,
    membership: AuthenticatedScannerMembership,
  ) {
    this.logger.log(
      `scanner.manifest.started eventId=${eventId} membershipId=${membership.id}`,
    );
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: {
          orderBy: {
            serialNumber: "asc",
          },
          include: {
            currentOwner: true,
          },
        },
      },
    });

    if (!event) {
      this.logger.warn(`scanner.manifest.not_found eventId=${eventId} membershipId=${membership.id}`);
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    const manifestVersion =
      Math.max(
        1,
        ...event.tickets.map((ticket) => ticket.ownershipRevision),
      );

    const manifest = {
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      manifestVersion,
      generatedAt: new Date(),
      tickets: event.tickets.map((ticket) => ({
        serialNumber: ticket.serialNumber,
        qrTokenId: ticket.qrTokenId,
        ownershipRevision: ticket.ownershipRevision,
        status: ticket.status,
        ownerEmail: ticket.currentOwner.email,
      })),
    };

    this.logger.log(
      `scanner.manifest.completed eventId=${event.id} membershipId=${membership.id} manifestVersion=${manifestVersion} tickets=${manifest.tickets.length}`,
    );

    return manifest;
  }

  async validateTicket(
    eventId: string,
    payload: ValidateScanDto,
    user: AuthenticatedUser,
    membership: AuthenticatedScannerMembership,
  ) {
    this.logger.log(
      `scanner.validate.started eventId=${eventId} userId=${user.id} membershipId=${membership.id} mode=${payload.mode ?? ScanMode.ONLINE} scanSessionId=${payload.scanSessionId ?? "new"} hasQrPayload=${payload.qrPayload ? "yes" : "no"} hasQrTokenId=${payload.qrTokenId ? "yes" : "no"}`,
    );
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.warn(
        `scanner.validate.event_not_found eventId=${eventId} userId=${user.id} membershipId=${membership.id}`,
      );
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    try {
      await this.assertScannerReferences(eventId, payload);
    } catch (error) {
      this.logger.warn(
        `scanner.validate.invalid_references eventId=${eventId} userId=${user.id} membershipId=${membership.id} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    let scannedPayload: ReturnType<typeof this.resolveScannedPayload>;

    try {
      scannedPayload = this.resolveScannedPayload(payload, eventId);
    } catch (error) {
      this.logger.warn(
        `scanner.validate.invalid_payload eventId=${eventId} userId=${user.id} membershipId=${membership.id} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }

    const scanSessionId = await this.resolveScanSessionId(eventId, {
      scanSessionId: payload.scanSessionId,
      deviceFingerprint: payload.deviceFingerprint,
      deviceLabel: payload.deviceLabel,
      startedByUserId: user.id,
      staffMembershipId: membership.id,
      mode: payload.mode,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {
          eventId,
          qrTokenId: scannedPayload.qrTokenId,
        },
      });

      const scannedAt = new Date();

      if (!ticket) {
        await tx.scanAttempt.create({
          data: {
            eventId,
            scanSessionId,
            staffMembershipId: membership.id,
            scannedByUserId: user.id,
            scannedQrTokenId: scannedPayload.qrTokenId,
            scannedRevision: scannedPayload.scannedRevision,
            outcome: ScanOutcome.INVALID,
            reasonCode: "unknown_qr",
            scannedAt,
            deviceRecordedAt: payload.deviceRecordedAt
              ? new Date(payload.deviceRecordedAt)
              : undefined,
            offlineQueuedAt:
              payload.mode === ScanMode.OFFLINE_SYNC ? scannedAt : undefined,
          },
        });

        return {
          outcome: ScanOutcome.INVALID,
          reasonCode: "unknown_qr",
          ticketId: null,
          serialNumber: null,
          currentStatus: null,
          scanSessionId,
          scannedAt,
        };
      }

      if (
        scannedPayload.scannedRevision &&
        scannedPayload.scannedRevision !== ticket.ownershipRevision
      ) {
        await tx.scanAttempt.create({
          data: {
            eventId,
            ticketId: ticket.id,
            scanSessionId,
            staffMembershipId: membership.id,
            scannedByUserId: user.id,
            scannedQrTokenId: scannedPayload.qrTokenId,
            scannedRevision: scannedPayload.scannedRevision,
            outcome: ScanOutcome.INVALID,
            reasonCode: "stale_revision",
            scannedAt,
            deviceRecordedAt: payload.deviceRecordedAt
              ? new Date(payload.deviceRecordedAt)
              : undefined,
            offlineQueuedAt:
              payload.mode === ScanMode.OFFLINE_SYNC ? scannedAt : undefined,
          },
        });

        return {
          outcome: ScanOutcome.INVALID,
          reasonCode: "stale_revision",
          ticketId: ticket.id,
          serialNumber: ticket.serialNumber,
          currentStatus: ticket.status,
          scanSessionId,
          scannedAt,
        };
      }

      if (ticket.status === TicketStatus.USED) {
        await tx.scanAttempt.create({
          data: {
            eventId,
            ticketId: ticket.id,
            scanSessionId,
            staffMembershipId: membership.id,
            scannedByUserId: user.id,
            scannedQrTokenId: scannedPayload.qrTokenId,
            scannedRevision:
              scannedPayload.scannedRevision ?? ticket.ownershipRevision,
            outcome: ScanOutcome.ALREADY_USED,
            reasonCode: "already_used",
            scannedAt,
            deviceRecordedAt: payload.deviceRecordedAt
              ? new Date(payload.deviceRecordedAt)
              : undefined,
            offlineQueuedAt:
              payload.mode === ScanMode.OFFLINE_SYNC ? scannedAt : undefined,
          },
        });

        return {
          outcome: ScanOutcome.ALREADY_USED,
          reasonCode: "already_used",
          ticketId: ticket.id,
          serialNumber: ticket.serialNumber,
          currentStatus: ticket.status,
          scanSessionId,
          scannedAt,
        };
      }

      if (
        ticket.status === TicketStatus.TRANSFER_PENDING ||
        ticket.status === TicketStatus.RESALE_LISTED ||
        ticket.status === TicketStatus.CANCELLED ||
        ticket.status === TicketStatus.REFUNDED ||
        ticket.status === TicketStatus.RESERVED
      ) {
        await tx.scanAttempt.create({
          data: {
            eventId,
            ticketId: ticket.id,
            scanSessionId,
            staffMembershipId: membership.id,
            scannedByUserId: user.id,
            scannedQrTokenId: scannedPayload.qrTokenId,
            scannedRevision:
              scannedPayload.scannedRevision ?? ticket.ownershipRevision,
            outcome: ScanOutcome.BLOCKED,
            reasonCode: "ticket_not_eligible",
            scannedAt,
            deviceRecordedAt: payload.deviceRecordedAt
              ? new Date(payload.deviceRecordedAt)
              : undefined,
            offlineQueuedAt:
              payload.mode === ScanMode.OFFLINE_SYNC ? scannedAt : undefined,
          },
        });

        return {
          outcome: ScanOutcome.BLOCKED,
          reasonCode: "ticket_not_eligible",
          ticketId: ticket.id,
          serialNumber: ticket.serialNumber,
          currentStatus: ticket.status,
          scanSessionId,
          scannedAt,
        };
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.USED,
          usedAt: scannedAt,
        },
      });

      await tx.scanAttempt.create({
        data: {
          eventId,
          ticketId: ticket.id,
          scanSessionId,
          staffMembershipId: membership.id,
          scannedByUserId: user.id,
          scannedQrTokenId: scannedPayload.qrTokenId,
          scannedRevision:
            scannedPayload.scannedRevision ?? ticket.ownershipRevision,
          outcome: ScanOutcome.VALID,
          reasonCode: "first_entry",
          scannedAt,
          deviceRecordedAt: payload.deviceRecordedAt
            ? new Date(payload.deviceRecordedAt)
            : undefined,
          offlineQueuedAt:
            payload.mode === ScanMode.OFFLINE_SYNC ? scannedAt : undefined,
        },
      });

      return {
        outcome: ScanOutcome.VALID,
        reasonCode: "first_entry",
        ticketId: updatedTicket.id,
        serialNumber: updatedTicket.serialNumber,
        currentStatus: updatedTicket.status,
        scanSessionId,
        scannedAt,
      };
    });

    this.logger.log(
      `scanner.validate.completed eventId=${eventId} userId=${user.id} membershipId=${membership.id} scanSessionId=${result.scanSessionId ?? scanSessionId} outcome=${result.outcome} reasonCode=${result.reasonCode} ticketId=${result.ticketId ?? "none"} serialNumber=${result.serialNumber ?? "none"} mode=${payload.mode ?? ScanMode.ONLINE}`,
    );

    return result;
  }

  private resolveScannedPayload(payload: ValidateScanDto, eventId: string) {
    if (payload.qrPayload) {
      const verifiedPayload = this.qrTokensService.verifyTicketToken(
        payload.qrPayload,
      );

      if (verifiedPayload.eventId !== eventId) {
        throw new BadRequestException(
          `Scanned QR token does not belong to event "${eventId}".`,
        );
      }

      return {
        qrTokenId: verifiedPayload.qrTokenId,
        scannedRevision: verifiedPayload.ownershipRevision,
      };
    }

    if (!payload.qrTokenId) {
      throw new BadRequestException(
        'Either "qrPayload" or "qrTokenId" must be provided.',
      );
    }

    return {
      qrTokenId: payload.qrTokenId,
      scannedRevision: payload.scannedRevision,
    };
  }

  async syncAttempts(
    eventId: string,
    payload: SyncScanAttemptsDto,
    user: AuthenticatedUser,
    membership: AuthenticatedScannerMembership,
  ) {
    this.logger.log(
      `scanner.sync.started eventId=${eventId} userId=${user.id} membershipId=${membership.id} attempts=${payload.attempts.length} mode=${payload.mode ?? ScanMode.OFFLINE_SYNC} scanSessionId=${payload.scanSessionId ?? "new"}`,
    );
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.warn(
        `scanner.sync.event_not_found eventId=${eventId} userId=${user.id} membershipId=${membership.id}`,
      );
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    try {
      await this.assertScannerReferences(eventId, payload);
    } catch (error) {
      this.logger.warn(
        `scanner.sync.invalid_references eventId=${eventId} userId=${user.id} membershipId=${membership.id} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
      throw error;
    }
    const scanSessionId = await this.resolveScanSessionId(eventId, {
      scanSessionId: payload.scanSessionId,
      deviceFingerprint: payload.deviceFingerprint,
      deviceLabel: payload.deviceLabel,
      startedByUserId: user.id,
      staffMembershipId: membership.id,
      mode: payload.mode,
    });

    const knownTickets = await this.prisma.ticket.findMany({
      where: {
        eventId,
        qrTokenId: {
          in: payload.attempts.map((attempt) => attempt.qrTokenId),
        },
      },
      select: {
        id: true,
        qrTokenId: true,
      },
    });

    const ticketByQr = new Map(
      knownTickets.map((ticket) => [ticket.qrTokenId, ticket.id]),
    );

    const unmatchedAttempts = payload.attempts.filter(
      (attempt) => !ticketByQr.has(attempt.qrTokenId),
    ).length;

    await this.prisma.scanAttempt.createMany({
      data: payload.attempts.map((attempt) => ({
        eventId,
        ticketId: ticketByQr.get(attempt.qrTokenId) ?? null,
        scanSessionId,
        staffMembershipId: membership.id,
        scannedByUserId: user.id,
        scannedQrTokenId: attempt.qrTokenId,
        scannedRevision: attempt.scannedRevision,
        outcome: attempt.outcome,
        reasonCode: attempt.reasonCode,
        scannedAt: new Date(attempt.scannedAt),
        deviceRecordedAt: attempt.deviceRecordedAt
          ? new Date(attempt.deviceRecordedAt)
          : undefined,
        offlineQueuedAt: new Date(attempt.scannedAt),
        syncedAt: new Date(),
      })),
    });

    this.logger.log(
      `scanner.sync.completed eventId=${eventId} userId=${user.id} membershipId=${membership.id} scanSessionId=${scanSessionId} accepted=${payload.attempts.length} unmatched=${unmatchedAttempts}`,
    );

    return {
      eventId,
      scanSessionId,
      acceptedCount: payload.attempts.length,
    };
  }

  private async resolveScanSessionId(
    eventId: string,
    payload: {
      scanSessionId?: string;
      deviceFingerprint?: string;
      deviceLabel?: string;
      startedByUserId?: string;
      staffMembershipId?: string;
      mode?: ScanMode;
    },
  ) {
    if (payload.scanSessionId) {
      return payload.scanSessionId;
    }

    const existingSession =
      payload.deviceFingerprint &&
      (await this.prisma.scanSession.findFirst({
        where: {
          eventId,
          deviceFingerprint: payload.deviceFingerprint,
          endedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
      }));

    if (existingSession) {
      this.logger.log(
        `scanner.session.reused eventId=${eventId} scanSessionId=${existingSession.id} deviceFingerprint=${payload.deviceFingerprint ?? "none"}`,
      );
      return existingSession.id;
    }

    const scanSession = await this.prisma.scanSession.create({
      data: {
        eventId,
        staffMembershipId: payload.staffMembershipId,
        startedByUserId: payload.startedByUserId,
        deviceFingerprint: payload.deviceFingerprint,
        deviceLabel: payload.deviceLabel,
        mode: payload.mode ?? ScanMode.ONLINE,
        startedAt: new Date(),
        lastSyncedAt:
          payload.mode === ScanMode.OFFLINE_SYNC ? new Date() : undefined,
      },
    });

    this.logger.log(
      `scanner.session.created eventId=${eventId} scanSessionId=${scanSession.id} deviceFingerprint=${payload.deviceFingerprint ?? "none"} deviceLabel=${payload.deviceLabel ?? "unknown"} mode=${payload.mode ?? ScanMode.ONLINE}`,
    );

    return scanSession.id;
  }

  private async assertScannerReferences(
    eventId: string,
    payload: {
      scanSessionId?: string;
    },
  ) {
    if (payload.scanSessionId) {
      const scanSession = await this.prisma.scanSession.findFirst({
        where: {
          id: payload.scanSessionId,
          eventId,
        },
        select: {
          id: true,
        },
      });

      if (!scanSession) {
        throw new BadRequestException(
          `Scan session "${payload.scanSessionId}" does not exist for event "${eventId}".`,
        );
      }
    }
  }
}
