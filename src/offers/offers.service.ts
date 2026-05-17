import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { isOfferRangePricingEnabled } from "../common/feature-flags";
import { CreateTicketOfferRequestDto } from "./dto/create-ticket-offer-request.dto";
import { ListTicketOfferRequestsQueryDto } from "./dto/list-ticket-offer-requests-query.dto";
import { ReviewTicketOfferRequestDto } from "./dto/review-ticket-offer-request.dto";
import { toTicketOfferRequestResponse } from "./mappers/ticket-offer-request-response.mapper";

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOfferRequest(
    eventId: string,
    ticketTypeId: string,
    payload: CreateTicketOfferRequestDto,
    user: AuthenticatedUser,
  ) {
    this.assertOfferRangeFeatureEnabled();

    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id: ticketTypeId,
        eventId,
      },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException(
        `Ticket type "${ticketTypeId}" was not found for event "${eventId}".`,
      );
    }

    if (ticketType.pricingMode !== "OFFER_RANGE") {
      throw new BadRequestException("Offer requests are only available for offer-range ticket types.");
    }

    if (!ticketType.minOfferPrice || !ticketType.maxOfferPrice) {
      throw new BadRequestException("Ticket type offer range is not configured.");
    }

    const offeredPrice = new Prisma.Decimal(payload.offeredPrice);

    if (offeredPrice.lt(ticketType.minOfferPrice) || offeredPrice.gt(ticketType.maxOfferPrice)) {
      throw new BadRequestException(
        `Offered price must be between ${ticketType.minOfferPrice.toFixed(2)} and ${ticketType.maxOfferPrice.toFixed(2)} ${ticketType.currency}.`,
      );
    }

    const expiresAt = new Date(
      Date.now() + ticketType.offerAutoExpireMinutes * 60 * 1000,
    );

    const offerRequest = await this.prisma.ticketOfferRequest.create({
      data: {
        attendeeUserId: user.id,
        currency: ticketType.currency,
        eventId,
        expiresAt,
        offeredPrice,
        ticketTypeId,
      },
      include: this.offerRequestInclude(),
    });

    const reviewers = await this.prisma.staffMembership.findMany({
      where: {
        eventId,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    for (const reviewer of reviewers) {
      await this.notificationsService.createUserNotification({
        actionUrl: `/organizer?eventId=${encodeURIComponent(eventId)}&tab=offers`,
        body: `New offer request for ${ticketType.name}: ${offeredPrice.toFixed(2)} ${ticketType.currency}.`,
        metadata: {
          attendeeUserId: user.id,
          eventId,
          offerRequestId: offerRequest.id,
          ticketTypeId,
        },
        sendPush: true,
        title: "New ticket offer request",
        type: NotificationType.OFFER_REQUEST_RECEIVED,
        userId: reviewer.userId,
      });
    }

    this.logger.log(
      `offers.request.created offerRequestId=${offerRequest.id} eventId=${eventId} ticketTypeId=${ticketTypeId} attendeeUserId=${user.id} offeredPrice=${offeredPrice.toFixed(2)} currency=${ticketType.currency}`,
    );

    return toTicketOfferRequestResponse(offerRequest);
  }

  async listEventOffers(
    eventId: string,
    query: ListTicketOfferRequestsQueryDto,
    user: AuthenticatedUser,
  ) {
    this.assertOfferRangeFeatureEnabled();
    await this.assertOrganizerAccess(eventId, user);

    const offers = await this.prisma.ticketOfferRequest.findMany({
      where: {
        eventId,
        status: query.status ?? "PENDING",
      },
      include: this.offerRequestInclude(),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return offers.map((offer) => toTicketOfferRequestResponse(offer));
  }

  async listMyOffers(query: ListTicketOfferRequestsQueryDto, user: AuthenticatedUser) {
    this.assertOfferRangeFeatureEnabled();
    const offers = await this.prisma.ticketOfferRequest.findMany({
      where: {
        attendeeUserId: user.id,
        status: query.status,
      },
      include: this.offerRequestInclude(),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return offers.map((offer) => toTicketOfferRequestResponse(offer));
  }

  async acceptOfferRequest(
    offerId: string,
    payload: ReviewTicketOfferRequestDto,
    user: AuthenticatedUser,
  ) {
    this.assertOfferRangeFeatureEnabled();
    const offer = await this.requireOfferById(offerId);
    await this.assertOrganizerAccess(offer.eventId, user);
    this.assertPendingAndNotExpired(offer);

    const updatedOffer = await this.prisma.ticketOfferRequest.update({
      where: { id: offer.id },
      data: {
        checkoutUnlockToken: this.generateCheckoutUnlockToken(),
        status: "ACCEPTED",
        organizerNote: payload.organizerNote?.trim() || null,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
      include: this.offerRequestInclude(),
    });

    const event = await this.prisma.event.findUnique({
      where: { id: updatedOffer.eventId },
      select: { slug: true },
    });

    await this.notificationsService.createUserNotification({
      actionUrl:
        `/checkout/start?eventSlug=${encodeURIComponent(event?.slug ?? "")}` +
        `&ticketTypeId=${encodeURIComponent(updatedOffer.ticketTypeId)}` +
        "&quantity=1" +
        `&offerRequestId=${encodeURIComponent(updatedOffer.id)}` +
        `&offerUnlockToken=${encodeURIComponent(updatedOffer.checkoutUnlockToken ?? "")}`,
      body: `Your offer for ${updatedOffer.ticketType.name} was accepted. Continue to checkout.`,
      metadata: {
        eventId: updatedOffer.eventId,
        offerRequestId: updatedOffer.id,
        ticketTypeId: updatedOffer.ticketTypeId,
      },
      sendPush: true,
      title: "Offer accepted",
      type: NotificationType.OFFER_REQUEST_ACCEPTED,
      userId: updatedOffer.attendeeUserId,
    });

    this.logger.log(
      `offers.request.accepted offerRequestId=${updatedOffer.id} eventId=${updatedOffer.eventId} ticketTypeId=${updatedOffer.ticketTypeId} attendeeUserId=${updatedOffer.attendeeUserId}`,
    );

    return toTicketOfferRequestResponse(updatedOffer);
  }

  async rejectOfferRequest(
    offerId: string,
    payload: ReviewTicketOfferRequestDto,
    user: AuthenticatedUser,
  ) {
    this.assertOfferRangeFeatureEnabled();
    const offer = await this.requireOfferById(offerId);
    await this.assertOrganizerAccess(offer.eventId, user);
    this.assertPendingAndNotExpired(offer);

    const updatedOffer = await this.prisma.ticketOfferRequest.update({
      where: { id: offer.id },
      data: {
        status: "REJECTED",
        organizerNote: payload.organizerNote?.trim() || null,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
      include: this.offerRequestInclude(),
    });

    await this.notificationsService.createUserNotification({
      actionUrl: "/wallet?tab=notifications",
      body: `Your offer for ${updatedOffer.ticketType.name} was rejected. Try a new offer amount.`,
      metadata: {
        eventId: updatedOffer.eventId,
        offerRequestId: updatedOffer.id,
        ticketTypeId: updatedOffer.ticketTypeId,
      },
      sendPush: true,
      title: "Offer rejected",
      type: NotificationType.OFFER_REQUEST_REJECTED,
      userId: updatedOffer.attendeeUserId,
    });

    this.logger.log(
      `offers.request.rejected offerRequestId=${updatedOffer.id} eventId=${updatedOffer.eventId} ticketTypeId=${updatedOffer.ticketTypeId} attendeeUserId=${updatedOffer.attendeeUserId}`,
    );

    return toTicketOfferRequestResponse(updatedOffer);
  }

  private assertOfferRangeFeatureEnabled() {
    if (!isOfferRangePricingEnabled()) {
      throw new BadRequestException(
        "Offer-range pricing is currently disabled in this environment.",
      );
    }
  }

  private offerRequestInclude() {
    return {
      attendeeUser: {
        include: {
          profile: true,
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private async requireOfferById(offerId: string) {
    const offer = await this.prisma.ticketOfferRequest.findUnique({
      where: { id: offerId },
      include: this.offerRequestInclude(),
    });

    if (!offer) {
      throw new NotFoundException(`Ticket offer request "${offerId}" was not found.`);
    }

    return offer;
  }

  private assertPendingAndNotExpired(offer: {
    status: string;
    expiresAt: Date;
  }) {
    if (offer.status !== "PENDING") {
      throw new BadRequestException("Only pending offer requests can be reviewed.");
    }

    if (offer.expiresAt <= new Date()) {
      throw new BadRequestException("This offer request has already expired.");
    }
  }

  private async assertOrganizerAccess(eventId: string, user: AuthenticatedUser) {
    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        eventId,
        userId: user.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        `User "${user.id}" does not have organizer access for event "${eventId}".`,
      );
    }
  }

  private generateCheckoutUnlockToken() {
    return `ofr_tok_${randomBytes(24).toString("hex")}`;
  }
}
