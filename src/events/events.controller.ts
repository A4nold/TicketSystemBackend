import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
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
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { StaffRole } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequireEventRoles } from "../auth/decorators/require-event-roles.decorator";
import { EventMembershipGuard } from "../auth/guards/event-membership.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import {
  EventDetailResponseDto,
  EventStaffMemberDto,
  EventSummaryResponseDto,
  EventTicketTypeDto,
  StaffMembershipResponseDto,
} from "./dto/event-response.dto";
import { InviteStaffMemberDto } from "./dto/invite-staff-member.dto";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import { UpdateStaffRoleDto } from "./dto/update-staff-role.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import { EventQueryService } from "./event-query.service";
import { EventShareAnalyticsService } from "./event-share-analytics.service";
import { EventsService } from "./events.service";
import { CaptureEventShareAnalyticsDto } from "./dto/capture-event-share-analytics.dto";
import { RateLimit } from "../common/security/rate-limit.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";
import { EventMediaService } from "./event-media.service";
import { EventFlyerService } from "./event-flyer.service";
import { GenerateEventFlyerDto } from "./dto/generate-event-flyer.dto";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(
    private readonly eventQueryService: EventQueryService,
    private readonly eventsService: EventsService,
    private readonly eventShareAnalyticsService: EventShareAnalyticsService,
    private readonly eventMediaService: EventMediaService,
    private readonly eventFlyerService: EventFlyerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List events",
    description: "Returns seeded or persisted events with organizer and ticket type summaries.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Optional event status filter",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    description: "Sort direction by start time",
    enum: ["asc", "desc"],
  })
  @ApiOkResponse({
    description: "List of events",
    type: EventSummaryResponseDto,
    isArray: true,
  })
  getEvents(@Query() query: ListEventsQueryDto) {
    return this.eventQueryService.listEvents(query);
  }

  @Get(":slug")
  @ApiOperation({
    summary: "Get event by slug",
    description: "Returns detailed event information, staff, and top-level metrics.",
  })
  @ApiParam({
    name: "slug",
    description: "Event slug",
    example: "campus-neon-takeover",
  })
  @ApiOkResponse({
    description: "Detailed event response",
    type: EventDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Event was not found",
  })
  getEvent(@Param("slug") slug: string) {
    return this.eventQueryService.getEventBySlug(slug);
  }

  @Post(":eventId/share/analytics")
  @ApiOperation({
    summary: "Capture event share/public engagement analytics",
    description:
      "Captures share and public-event engagement actions for product analytics.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Analytics event accepted",
  })
  @ApiNotFoundResponse({
    description: "Event was not found",
  })
  @RateLimit({
    keyPrefix: "events:share-analytics",
    maxRequests: 240,
    windowMs: 60_000,
  })
  captureShareAnalytics(
    @Param("eventId") eventId: string,
    @Body() payload: CaptureEventShareAnalyticsDto,
  ) {
    return this.eventShareAnalyticsService.capture(eventId, payload);
  }

  @Post(":eventId/media/header")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: "Upload event header image",
    description:
      "Uploads organizer-managed event header media for public/share surfaces.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Updated event media URLs",
  })
  uploadHeaderMedia(
    @Param("eventId") eventId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventMediaService.uploadEventHeaderMedia(eventId, file as Express.Multer.File);
  }

  @Delete(":eventId/media/header")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Remove event header image",
    description: "Clears the organizer-managed event header media.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiOkResponse({
    description: "Updated event media URLs",
  })
  removeHeaderMedia(@Param("eventId") eventId: string) {
    return this.eventMediaService.removeEventHeaderMedia(eventId);
  }

  @Post(":eventId/share/flyer")
  @ApiOperation({
    summary: "Generate event share flyer",
    description:
      "Generates an event flyer asset for share/download. MVP currently enables 4x5 only.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Generated flyer metadata",
  })
  @ApiNotFoundResponse({
    description: "Event was not found",
  })
  @RateLimit({
    keyPrefix: "events:share-flyer",
    maxRequests: 60,
    windowMs: 60_000,
  })
  generateShareFlyer(
    @Param("eventId") eventId: string,
    @Body() payload: GenerateEventFlyerDto,
  ) {
    return this.eventFlyerService.generate(eventId, payload.size);
  }

  @Post()
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create an event",
    description: "Creates a new organizer-owned event and registers the creator as the event owner.",
  })
  @ApiCreatedResponse({
    description: "Created event response",
    type: EventDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Event payload was invalid or the slug is already in use",
  })
  @ApiForbiddenResponse({
    description: "Authenticated user is not organizer-capable",
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  createEvent(
    @Body() payload: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.createEvent(payload, user);
  }

  @Patch(":eventId")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Update an event",
    description: "Updates an existing event when it belongs to the authenticated organizer.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiOkResponse({
    description: "Updated event response",
    type: EventDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Event payload was invalid",
  })
  @ApiNotFoundResponse({
    description: "Event was not found",
  })
  updateEvent(
    @Param("eventId") eventId: string,
    @Body() payload: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(eventId, payload);
  }

  @Post(":eventId/ticket-types")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Create a ticket type",
    description: "Adds a new ticket type to an organizer-owned event.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Created ticket type response",
    type: EventTicketTypeDto,
  })
  @ApiBadRequestResponse({
    description: "Ticket type payload was invalid",
  })
  @ApiNotFoundResponse({
    description: "Event was not found",
  })
  createTicketType(
    @Param("eventId") eventId: string,
    @Body() payload: CreateTicketTypeDto,
  ) {
    return this.eventsService.createTicketType(eventId, payload);
  }

  @Patch(":eventId/ticket-types/:ticketTypeId")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Update a ticket type",
    description: "Updates a ticket type when it belongs to an organizer-owned event.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiParam({
    name: "ticketTypeId",
    description: "Ticket type identifier",
  })
  @ApiOkResponse({
    description: "Updated ticket type response",
    type: EventTicketTypeDto,
  })
  @ApiBadRequestResponse({
    description: "Ticket type payload was invalid",
  })
  @ApiNotFoundResponse({
    description: "Event or ticket type was not found",
  })
  updateTicketType(
    @Param("eventId") eventId: string,
    @Param("ticketTypeId") ticketTypeId: string,
    @Body() payload: UpdateTicketTypeDto,
  ) {
    return this.eventsService.updateTicketType(eventId, ticketTypeId, payload);
  }

  @Get(":eventId/staff")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "List event staff memberships",
    description: "Returns staff memberships for an organizer-owned event.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiOkResponse({
    description: "Event staff memberships",
    type: StaffMembershipResponseDto,
    isArray: true,
  })
  listStaff(
    @Param("eventId") eventId: string,
  ) {
    return this.eventsService.listStaff(eventId);
  }

  @Post(":eventId/staff/invite")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Invite a staff member",
    description: "Invites an existing user to join an organizer-owned event as an admin or scanner.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Created or updated staff membership invite",
    type: StaffMembershipResponseDto,
  })
  inviteStaff(
    @Param("eventId") eventId: string,
    @Body() payload: InviteStaffMemberDto,
  ) {
    return this.eventsService.inviteStaff(eventId, payload);
  }

  @Post(":eventId/staff/accept")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Accept a staff invite",
    description: "Allows the invited authenticated user to accept their event staff invitation.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Accepted staff membership",
    type: StaffMembershipResponseDto,
  })
  acceptStaffInvite(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.acceptStaffInvite(eventId, user);
  }

  @Patch(":eventId/staff/:membershipId")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Update a staff role",
    description: "Changes an invited or accepted staff member role on an organizer-owned event.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiParam({
    name: "membershipId",
    description: "Staff membership identifier",
  })
  @ApiOkResponse({
    description: "Updated staff membership",
    type: StaffMembershipResponseDto,
  })
  updateStaffRole(
    @Param("eventId") eventId: string,
    @Param("membershipId") membershipId: string,
    @Body() payload: UpdateStaffRoleDto,
  ) {
    return this.eventsService.updateStaffRole(eventId, membershipId, payload);
  }

  @Post(":eventId/staff/:membershipId/revoke")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN)
  @ApiOperation({
    summary: "Revoke a staff membership",
    description: "Removes an admin or scanner membership from an organizer-owned event.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiParam({
    name: "membershipId",
    description: "Staff membership identifier",
  })
  @ApiCreatedResponse({
    description: "Revoked staff membership",
    type: EventStaffMemberDto,
  })
  revokeStaff(
    @Param("eventId") eventId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.eventsService.revokeStaff(eventId, membershipId);
  }
}
