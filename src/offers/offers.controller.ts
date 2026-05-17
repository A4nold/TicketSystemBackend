import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateTicketOfferRequestDto } from "./dto/create-ticket-offer-request.dto";
import { ListTicketOfferRequestsQueryDto } from "./dto/list-ticket-offer-requests-query.dto";
import { ReviewTicketOfferRequestDto } from "./dto/review-ticket-offer-request.dto";
import { TicketOfferRequestResponseDto } from "./dto/ticket-offer-request-response.dto";
import { OffersService } from "./offers.service";

@ApiTags("offers")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post("events/:eventId/ticket-types/:ticketTypeId/offers")
  @ApiOperation({
    summary: "Submit a ticket offer request",
    description: "Creates a pending attendee offer for an offer-range ticket type.",
  })
  @ApiParam({ name: "eventId", description: "Event id" })
  @ApiParam({ name: "ticketTypeId", description: "Ticket type id" })
  @ApiCreatedResponse({
    description: "Offer request created",
    type: TicketOfferRequestResponseDto,
  })
  @ApiBadRequestResponse({ description: "Offer request payload was invalid" })
  @ApiNotFoundResponse({ description: "Event or ticket type was not found" })
  createOfferRequest(
    @Param("eventId") eventId: string,
    @Param("ticketTypeId") ticketTypeId: string,
    @Body() payload: CreateTicketOfferRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offersService.createOfferRequest(eventId, ticketTypeId, payload, user);
  }

  @Get("events/:eventId/offers")
  @ApiOperation({
    summary: "List offer requests for an event",
    description: "Returns organizer-facing offer requests filtered by status.",
  })
  @ApiParam({ name: "eventId", description: "Event id" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  })
  @ApiOkResponse({
    description: "Offer requests for the event",
    type: TicketOfferRequestResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: "Organizer access required for this event" })
  listEventOffers(
    @Param("eventId") eventId: string,
    @Query() query: ListTicketOfferRequestsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offersService.listEventOffers(eventId, query, user);
  }

  @Post("offers/:offerId/accept")
  @ApiOperation({
    summary: "Accept a pending offer request",
    description: "Accepts an attendee offer request for an event ticket type.",
  })
  @ApiParam({ name: "offerId", description: "Offer request id" })
  @ApiCreatedResponse({
    description: "Offer request accepted",
    type: TicketOfferRequestResponseDto,
  })
  @ApiBadRequestResponse({ description: "Offer request cannot be accepted" })
  @ApiNotFoundResponse({ description: "Offer request was not found" })
  acceptOfferRequest(
    @Param("offerId") offerId: string,
    @Body() payload: ReviewTicketOfferRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offersService.acceptOfferRequest(offerId, payload, user);
  }

  @Post("offers/:offerId/reject")
  @ApiOperation({
    summary: "Reject a pending offer request",
    description: "Rejects an attendee offer request for an event ticket type.",
  })
  @ApiParam({ name: "offerId", description: "Offer request id" })
  @ApiCreatedResponse({
    description: "Offer request rejected",
    type: TicketOfferRequestResponseDto,
  })
  @ApiBadRequestResponse({ description: "Offer request cannot be rejected" })
  @ApiNotFoundResponse({ description: "Offer request was not found" })
  rejectOfferRequest(
    @Param("offerId") offerId: string,
    @Body() payload: ReviewTicketOfferRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offersService.rejectOfferRequest(offerId, payload, user);
  }
}

