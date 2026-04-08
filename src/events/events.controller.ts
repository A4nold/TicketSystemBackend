import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
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
import { EventsService } from "./events.service";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
    return this.eventsService.listEvents(query);
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
    return this.eventsService.getEventBySlug(slug);
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
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.updateEvent(eventId, payload, user);
  }

  @Post(":eventId/ticket-types")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.createTicketType(eventId, payload, user);
  }

  @Patch(":eventId/ticket-types/:ticketTypeId")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.updateTicketType(eventId, ticketTypeId, payload, user);
  }

  @Get(":eventId/staff")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.listStaff(eventId, user);
  }

  @Post(":eventId/staff/invite")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.inviteStaff(eventId, payload, user);
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
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.updateStaffRole(eventId, membershipId, payload, user);
  }

  @Post(":eventId/staff/:membershipId/revoke")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.revokeStaff(eventId, membershipId, user);
  }
}
