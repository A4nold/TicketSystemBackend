import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, StaffRole } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { InviteStaffMemberDto } from "./dto/invite-staff-member.dto";
import { UpdateStaffRoleDto } from "./dto/update-staff-role.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import { EventLifecycleService } from "./event-lifecycle.service";
import {
  toStaffMembershipResponse,
  toTicketTypeResponse,
} from "./mappers/event-response.mapper";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLifecycleService: EventLifecycleService,
  ) {}

  async createEvent(payload: CreateEventDto, user: AuthenticatedUser) {
    return this.eventLifecycleService.createEvent(payload, user);
  }

  async updateEvent(eventId: string, payload: UpdateEventDto) {
    return this.eventLifecycleService.updateEvent(eventId, payload);
  }

  async createTicketType(eventId: string, payload: CreateTicketTypeDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }
    this.assertTicketTypeDates(payload, event);

    const ticketType = await this.prisma.ticketType.create({
      data: {
        eventId,
        name: payload.name.trim(),
        description: payload.description?.trim(),
        price: new Prisma.Decimal(payload.price),
        currency: payload.currency?.trim() ?? "EUR",
        quantity: payload.quantity,
        maxPerOrder: payload.maxPerOrder ?? null,
        saleStartsAt: payload.saleStartsAt ? new Date(payload.saleStartsAt) : null,
        saleEndsAt: payload.saleEndsAt ? new Date(payload.saleEndsAt) : null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
      },
    });

    return toTicketTypeResponse(ticketType);
  }

  async updateTicketType(
    eventId: string,
    ticketTypeId: string,
    payload: UpdateTicketTypeDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    const existingTicketType = await this.prisma.ticketType.findFirst({
      where: {
        id: ticketTypeId,
        eventId,
      },
    });

    if (!existingTicketType) {
      throw new NotFoundException(
        `Ticket type "${ticketTypeId}" was not found for event "${eventId}".`,
      );
    }

    this.assertTicketTypeDates(payload, event, existingTicketType);

    const ticketType = await this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description?.trim() ?? null }
          : {}),
        ...(payload.price !== undefined
          ? { price: new Prisma.Decimal(payload.price) }
          : {}),
        ...(payload.currency !== undefined
          ? { currency: payload.currency.trim() }
          : {}),
        ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
        ...(payload.maxPerOrder !== undefined
          ? { maxPerOrder: payload.maxPerOrder ?? null }
          : {}),
        ...(payload.saleStartsAt !== undefined
          ? {
              saleStartsAt: payload.saleStartsAt
                ? new Date(payload.saleStartsAt)
                : null,
            }
          : {}),
        ...(payload.saleEndsAt !== undefined
          ? {
              saleEndsAt: payload.saleEndsAt ? new Date(payload.saleEndsAt) : null,
            }
          : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
    });

    return toTicketTypeResponse(ticketType);
  }

  async listStaff(eventId: string) {
    const event = await this.requireEventWithDetail(eventId);

    return event.staffMemberships.map((membership) =>
      toStaffMembershipResponse(membership),
    );
  }

  async inviteStaff(eventId: string, payload: InviteStaffMemberDto) {
    if (payload.role !== StaffRole.ADMIN && payload.role !== StaffRole.SCANNER) {
      throw new BadRequestException("Only ADMIN or SCANNER roles can be invited.");
    }

    await this.requireEvent(eventId);

    const invitee = await this.prisma.user.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
      include: {
        profile: true,
      },
    });

    if (!invitee) {
      throw new BadRequestException(
        `No registered user exists with email "${payload.email.trim().toLowerCase()}".`,
      );
    }

    const membership = await this.prisma.staffMembership.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: invitee.id,
        },
      },
      update: {
        role: payload.role,
        invitedAt: new Date(),
        acceptedAt: null,
      },
      create: {
        eventId,
        userId: invitee.id,
        role: payload.role,
        invitedAt: new Date(),
        acceptedAt: null,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return toStaffMembershipResponse(membership);
  }

  async acceptStaffInvite(eventId: string, user: AuthenticatedUser) {
    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        eventId,
        userId: user.id,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `No staff invite was found for user "${user.id}" on event "${eventId}".`,
      );
    }

    if (membership.role === StaffRole.OWNER) {
      return toStaffMembershipResponse(membership);
    }

    const acceptedMembership = await this.prisma.staffMembership.update({
      where: { id: membership.id },
      data: {
        acceptedAt: membership.acceptedAt ?? new Date(),
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return toStaffMembershipResponse(acceptedMembership);
  }

  async updateStaffRole(
    eventId: string,
    membershipId: string,
    payload: UpdateStaffRoleDto,
  ) {
    if (payload.role !== StaffRole.ADMIN && payload.role !== StaffRole.SCANNER) {
      throw new BadRequestException("Staff role must be ADMIN or SCANNER.");
    }

    await this.requireEvent(eventId);

    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        id: membershipId,
        eventId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Staff membership "${membershipId}" was not found for event "${eventId}".`,
      );
    }

    if (membership.role === StaffRole.OWNER) {
      throw new BadRequestException("Owner role cannot be reassigned through this endpoint.");
    }

    const updatedMembership = await this.prisma.staffMembership.update({
      where: { id: membership.id },
      data: {
        role: payload.role,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return toStaffMembershipResponse(updatedMembership);
  }

  async revokeStaff(eventId: string, membershipId: string) {
    await this.requireEvent(eventId);

    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        id: membershipId,
        eventId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Staff membership "${membershipId}" was not found for event "${eventId}".`,
      );
    }

    if (membership.role === StaffRole.OWNER) {
      throw new BadRequestException("Owner membership cannot be revoked.");
    }

    const deletedMembership = await this.prisma.staffMembership.delete({
      where: { id: membership.id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return toStaffMembershipResponse(deletedMembership);
  }

  private eventDetailInclude() {
    return {
      organizer: {
        include: {
          profile: true,
        },
      },
      ticketTypes: {
        orderBy: {
          sortOrder: "asc" as const,
        },
      },
      staffMemberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
      _count: {
        select: {
          tickets: true,
          scanAttempts: true,
          resaleListings: true,
        },
      },
    };
  }

  private async requireEventWithDetail(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: this.eventDetailInclude(),
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    return event;
  }

  private async requireEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    return event;
  }

  private assertTicketTypeDates(
    payload: Partial<CreateTicketTypeDto>,
    event: {
      salesStartAt: Date | null;
      salesEndAt: Date | null;
    },
    existingTicketType?: {
      saleStartsAt: Date | null;
      saleEndsAt: Date | null;
    },
  ) {
    const saleStartsAt =
      payload.saleStartsAt !== undefined
        ? payload.saleStartsAt
          ? new Date(payload.saleStartsAt)
          : null
        : existingTicketType?.saleStartsAt ?? event.salesStartAt;
    const saleEndsAt =
      payload.saleEndsAt !== undefined
        ? payload.saleEndsAt
          ? new Date(payload.saleEndsAt)
          : null
        : existingTicketType?.saleEndsAt ?? event.salesEndAt;

    if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) {
      throw new BadRequestException(
        "Ticket-type sale end time must be after sale start time.",
      );
    }

    if (event.salesStartAt && saleStartsAt && saleStartsAt < event.salesStartAt) {
      throw new BadRequestException(
        "Ticket-type sales cannot start before the event sales window.",
      );
    }

    if (event.salesEndAt && saleEndsAt && saleEndsAt > event.salesEndAt) {
      throw new BadRequestException(
        "Ticket-type sales cannot end after the event sales window.",
      );
    }
  }
}
