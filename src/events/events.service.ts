import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, StaffRole } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { InviteStaffMemberDto } from "./dto/invite-staff-member.dto";
import { UpdateStaffRoleDto } from "./dto/update-staff-role.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(query: ListEventsQueryDto) {
    const where = query.status
      ? {
          status: query.status,
        }
      : undefined;

    const events = await this.prisma.event.findMany({
      where,
      orderBy: {
        startsAt: query.sort,
      },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        ticketTypes: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return events.map((event) => this.toEventSummaryResponse(event));
  }

  async getEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        ticketTypes: {
          orderBy: {
            sortOrder: "asc",
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
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with slug "${slug}" was not found.`);
    }

    return this.toEventDetailResponse(event);
  }

  async createEvent(payload: CreateEventDto, user: AuthenticatedUser) {
    this.assertEventDates(payload);

    const slug = await this.ensureUniqueSlug(
      payload.slug ? this.slugify(payload.slug) : this.slugify(payload.title),
    );
    const startsAt = new Date(payload.startsAt);
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;

    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          organizerId: user.id,
          title: payload.title.trim(),
          slug,
          description: payload.description?.trim(),
          venueName: payload.venueName?.trim(),
          venueAddress: payload.venueAddress?.trim(),
          timezone: payload.timezone.trim(),
          startsAt,
          endsAt,
          status: payload.status,
          coverImageUrl: payload.coverImageUrl?.trim(),
          salesStartAt: payload.salesStartAt
            ? new Date(payload.salesStartAt)
            : null,
          salesEndAt: payload.salesEndAt ? new Date(payload.salesEndAt) : null,
          allowResale: payload.allowResale ?? false,
          maxResalePrice: payload.maxResalePrice
            ? new Prisma.Decimal(payload.maxResalePrice)
            : null,
          resaleStartsAt: payload.resaleStartsAt
            ? new Date(payload.resaleStartsAt)
            : null,
          resaleEndsAt: payload.resaleEndsAt
            ? new Date(payload.resaleEndsAt)
            : null,
        },
      });

      await tx.staffMembership.create({
        data: {
          eventId: createdEvent.id,
          userId: user.id,
          role: StaffRole.OWNER,
          invitedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      return tx.event.findUniqueOrThrow({
        where: { id: createdEvent.id },
        include: this.eventDetailInclude(),
      });
    });

    return this.toEventDetailResponse(event);
  }

  async updateEvent(
    eventId: string,
    payload: UpdateEventDto,
    user: AuthenticatedUser,
  ) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.assertOrganizerOwnership(existingEvent.organizerId, user.id, eventId);
    this.assertEventDates(payload, existingEvent);

    const slug = payload.slug
      ? await this.ensureUniqueSlug(this.slugify(payload.slug), eventId)
      : undefined;

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(slug ? { slug } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description?.trim() ?? null }
          : {}),
        ...(payload.venueName !== undefined
          ? { venueName: payload.venueName?.trim() ?? null }
          : {}),
        ...(payload.venueAddress !== undefined
          ? { venueAddress: payload.venueAddress?.trim() ?? null }
          : {}),
        ...(payload.timezone !== undefined
          ? { timezone: payload.timezone.trim() }
          : {}),
        ...(payload.startsAt !== undefined
          ? { startsAt: new Date(payload.startsAt) }
          : {}),
        ...(payload.endsAt !== undefined
          ? { endsAt: payload.endsAt ? new Date(payload.endsAt) : null }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.coverImageUrl !== undefined
          ? { coverImageUrl: payload.coverImageUrl?.trim() ?? null }
          : {}),
        ...(payload.salesStartAt !== undefined
          ? {
              salesStartAt: payload.salesStartAt
                ? new Date(payload.salesStartAt)
                : null,
            }
          : {}),
        ...(payload.salesEndAt !== undefined
          ? {
              salesEndAt: payload.salesEndAt ? new Date(payload.salesEndAt) : null,
            }
          : {}),
        ...(payload.allowResale !== undefined
          ? { allowResale: payload.allowResale }
          : {}),
        ...(payload.maxResalePrice !== undefined
          ? {
              maxResalePrice: payload.maxResalePrice
                ? new Prisma.Decimal(payload.maxResalePrice)
                : null,
            }
          : {}),
        ...(payload.resaleStartsAt !== undefined
          ? {
              resaleStartsAt: payload.resaleStartsAt
                ? new Date(payload.resaleStartsAt)
                : null,
            }
          : {}),
        ...(payload.resaleEndsAt !== undefined
          ? {
              resaleEndsAt: payload.resaleEndsAt
                ? new Date(payload.resaleEndsAt)
                : null,
            }
          : {}),
      },
      include: this.eventDetailInclude(),
    });

    return this.toEventDetailResponse(event);
  }

  async createTicketType(
    eventId: string,
    payload: CreateTicketTypeDto,
    user: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.assertOrganizerOwnership(event.organizerId, user.id, eventId);
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

    return this.toTicketTypeResponse(ticketType);
  }

  async updateTicketType(
    eventId: string,
    ticketTypeId: string,
    payload: UpdateTicketTypeDto,
    user: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.assertOrganizerOwnership(event.organizerId, user.id, eventId);

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

    return this.toTicketTypeResponse(ticketType);
  }

  async listStaff(eventId: string, user: AuthenticatedUser) {
    const event = await this.requireOrganizerEvent(eventId, user.id);

    return event.staffMemberships.map((membership) =>
      this.toStaffMembershipResponse(membership),
    );
  }

  async inviteStaff(
    eventId: string,
    payload: InviteStaffMemberDto,
    user: AuthenticatedUser,
  ) {
    if (payload.role !== StaffRole.ADMIN && payload.role !== StaffRole.SCANNER) {
      throw new BadRequestException("Only ADMIN or SCANNER roles can be invited.");
    }

    await this.requireOrganizerEvent(eventId, user.id);

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

    return this.toStaffMembershipResponse(membership);
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
      return this.toStaffMembershipResponse(membership);
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

    return this.toStaffMembershipResponse(acceptedMembership);
  }

  async updateStaffRole(
    eventId: string,
    membershipId: string,
    payload: UpdateStaffRoleDto,
    user: AuthenticatedUser,
  ) {
    if (payload.role !== StaffRole.ADMIN && payload.role !== StaffRole.SCANNER) {
      throw new BadRequestException("Staff role must be ADMIN or SCANNER.");
    }

    await this.requireOrganizerEvent(eventId, user.id);

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

    return this.toStaffMembershipResponse(updatedMembership);
  }

  async revokeStaff(
    eventId: string,
    membershipId: string,
    user: AuthenticatedUser,
  ) {
    await this.requireOrganizerEvent(eventId, user.id);

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

    return this.toStaffMembershipResponse(deletedMembership);
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

  private async requireOrganizerEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: this.eventDetailInclude(),
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    this.assertOrganizerOwnership(event.organizerId, userId, eventId);
    return event;
  }

  private toEventSummaryResponse(event: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    venueName: string | null;
    venueAddress: string | null;
    timezone: string;
    startsAt: Date;
    endsAt: Date | null;
    status: string;
    coverImageUrl: string | null;
    allowResale: boolean;
    resaleStartsAt: Date | null;
    resaleEndsAt: Date | null;
    maxResalePrice: Prisma.Decimal | null;
    organizer: {
      id: string;
      email: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
    ticketTypes: Array<{
      id: string;
      name: string;
      description: string | null;
      price: Prisma.Decimal;
      currency: string;
      quantity: number;
      maxPerOrder: number | null;
      isActive: boolean;
      saleStartsAt?: Date | null;
      saleEndsAt?: Date | null;
    }>;
    _count: {
      tickets: number;
    };
  }) {
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      timezone: event.timezone,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      coverImageUrl: event.coverImageUrl,
      allowResale: event.allowResale,
      resaleWindow: {
        startsAt: event.resaleStartsAt,
        endsAt: event.resaleEndsAt,
        maxResalePrice: event.maxResalePrice?.toFixed(2) ?? null,
      },
      organizer: {
        id: event.organizer.id,
        email: event.organizer.email,
        firstName: event.organizer.profile?.firstName ?? null,
        lastName: event.organizer.profile?.lastName ?? null,
      },
      ticketTypes: event.ticketTypes.map((ticketType) =>
        this.toTicketTypeResponse(ticketType),
      ),
      issuedTicketsCount: event._count.tickets,
    };
  }

  private toEventDetailResponse(event: {
    salesStartAt: Date | null;
    salesEndAt: Date | null;
    staffMemberships: Array<{
      id: string;
      role: string;
      invitedAt: Date | null;
      acceptedAt: Date | null;
      user: {
        id: string;
        email: string;
        profile: {
          firstName: string | null;
          lastName: string | null;
        } | null;
      };
    }>;
    _count: {
      tickets: number;
      scanAttempts: number;
      resaleListings: number;
    };
  } & Parameters<EventsService["toEventSummaryResponse"]>[0]) {
    return {
      ...this.toEventSummaryResponse(event),
      salesWindow: {
        startsAt: event.salesStartAt,
        endsAt: event.salesEndAt,
      },
      resalePolicy: {
        allowResale: event.allowResale,
        maxResalePrice: event.maxResalePrice?.toFixed(2) ?? null,
        startsAt: event.resaleStartsAt,
        endsAt: event.resaleEndsAt,
      },
      staff: event.staffMemberships.map((membership) => ({
        ...this.toStaffMembershipResponse(membership),
      })),
      metrics: {
        tickets: event._count.tickets,
        scanAttempts: event._count.scanAttempts,
        resaleListings: event._count.resaleListings,
      },
    };
  }

  private toTicketTypeResponse(ticketType: {
    id: string;
    name: string;
    description: string | null;
    price: Prisma.Decimal;
    currency: string;
    quantity: number;
    maxPerOrder: number | null;
    isActive: boolean;
    saleStartsAt?: Date | null;
    saleEndsAt?: Date | null;
  }) {
    return {
      id: ticketType.id,
      name: ticketType.name,
      description: ticketType.description,
      price: ticketType.price.toFixed(2),
      currency: ticketType.currency,
      quantity: ticketType.quantity,
      maxPerOrder: ticketType.maxPerOrder,
      isActive: ticketType.isActive,
      saleStartsAt: ticketType.saleStartsAt ?? null,
      saleEndsAt: ticketType.saleEndsAt ?? null,
    };
  }

  private toStaffMembershipResponse(membership: {
    id: string;
    role: string;
    invitedAt: Date | null;
    acceptedAt: Date | null;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
  }) {
    return {
      id: membership.id,
      role: membership.role,
      invitedAt: membership.invitedAt,
      acceptedAt: membership.acceptedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.profile?.firstName ?? null,
        lastName: membership.user.profile?.lastName ?? null,
      },
    };
  }

  private assertOrganizerOwnership(
    organizerId: string,
    userId: string,
    eventId: string,
  ) {
    if (organizerId !== userId) {
      throw new BadRequestException(
        `User "${userId}" is not the organizer for event "${eventId}".`,
      );
    }
  }

  private assertEventDates(
    payload: Partial<CreateEventDto>,
    existingEvent?: {
      startsAt: Date;
      endsAt: Date | null;
      salesStartAt: Date | null;
      salesEndAt: Date | null;
      resaleStartsAt: Date | null;
      resaleEndsAt: Date | null;
      allowResale: boolean;
    },
  ) {
    const startsAt = payload.startsAt
      ? new Date(payload.startsAt)
      : existingEvent?.startsAt;
    const endsAt =
      payload.endsAt !== undefined
        ? payload.endsAt
          ? new Date(payload.endsAt)
          : null
        : existingEvent?.endsAt;
    const salesStartAt =
      payload.salesStartAt !== undefined
        ? payload.salesStartAt
          ? new Date(payload.salesStartAt)
          : null
        : existingEvent?.salesStartAt;
    const salesEndAt =
      payload.salesEndAt !== undefined
        ? payload.salesEndAt
          ? new Date(payload.salesEndAt)
          : null
        : existingEvent?.salesEndAt;
    const resaleStartsAt =
      payload.resaleStartsAt !== undefined
        ? payload.resaleStartsAt
          ? new Date(payload.resaleStartsAt)
          : null
        : existingEvent?.resaleStartsAt;
    const resaleEndsAt =
      payload.resaleEndsAt !== undefined
        ? payload.resaleEndsAt
          ? new Date(payload.resaleEndsAt)
          : null
        : existingEvent?.resaleEndsAt;
    const allowResale =
      payload.allowResale !== undefined
        ? payload.allowResale
        : existingEvent?.allowResale ?? false;

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException("Event end time must be after start time.");
    }

    if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
      throw new BadRequestException("Sales end time must be after sales start time.");
    }

    if (salesEndAt && startsAt && salesEndAt > startsAt) {
      throw new BadRequestException("Sales must close on or before the event start time.");
    }

    if (allowResale && resaleStartsAt && resaleEndsAt && resaleEndsAt <= resaleStartsAt) {
      throw new BadRequestException("Resale end time must be after resale start time.");
    }

    if (allowResale && resaleEndsAt && startsAt && resaleEndsAt > startsAt) {
      throw new BadRequestException("Resale must close on or before the event start time.");
    }
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

  private async ensureUniqueSlug(slug: string, currentEventId?: string) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { slug },
    });

    if (existingEvent && existingEvent.id !== currentEventId) {
      throw new BadRequestException(`Event slug "${slug}" is already in use.`);
    }

    return slug;
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      throw new BadRequestException("Event slug could not be derived from the provided value.");
    }

    return slug;
  }
}
