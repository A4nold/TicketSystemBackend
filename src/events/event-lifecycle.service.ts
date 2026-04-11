import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, StaffRole } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { toEventDetailResponse } from "./mappers/event-response.mapper";

@Injectable()
export class EventLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(payload: CreateEventDto, user: AuthenticatedUser) {
    if (!this.canCreateEvents(user)) {
      throw new ForbiddenException(
        "Only organizer-capable users can create events.",
      );
    }

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

    return toEventDetailResponse(event);
  }

  async updateEvent(eventId: string, payload: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

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

    return toEventDetailResponse(event);
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

  private canCreateEvents(user: AuthenticatedUser) {
    return (
      user.accountType === "ORGANIZER" ||
      user.platformRoles.includes("EVENT_OWNER") ||
      user.appRoles.includes("organizer")
    );
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

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private async ensureUniqueSlug(baseSlug: string, eventId?: string) {
    const normalizedBase = baseSlug || "event";
    let slug = normalizedBase;
    let counter = 1;

    while (true) {
      const existingEvent = await this.prisma.event.findUnique({
        where: { slug },
      });

      if (!existingEvent || existingEvent.id === eventId) {
        return slug;
      }

      counter += 1;
      slug = `${normalizedBase}-${counter}`;
    }
  }
}
