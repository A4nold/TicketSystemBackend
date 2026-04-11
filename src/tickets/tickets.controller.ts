import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { StaffRole } from "@prisma/client";

import { RequireEventRoles } from "../auth/decorators/require-event-roles.decorator";
import { EventMembershipGuard } from "../auth/guards/event-membership.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ListMyTicketsQueryDto } from "./dto/list-my-tickets-query.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import {
  TicketDetailResponseDto,
  TicketSummaryResponseDto,
} from "./dto/ticket-response.dto";
import { TicketQueryService } from "./ticket-query.service";
import { TicketsService } from "./tickets.service";

@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketQueryService: TicketQueryService) {}

  @Get()
  @ApiOperation({
    summary: "List tickets",
    description:
      "Returns tickets with event, owner, and scan summary information. Supports basic filtering for seeded and persisted data.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Optional ticket status filter",
  })
  @ApiQuery({
    name: "eventSlug",
    required: false,
    description: "Optional event slug filter",
  })
  @ApiQuery({
    name: "ownerEmail",
    required: false,
    description: "Optional current owner email filter",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    description: "Sort direction by ticket creation time",
    enum: ["asc", "desc"],
  })
  @ApiOkResponse({
    description: "List of tickets",
    type: TicketSummaryResponseDto,
    isArray: true,
  })
  getTickets(@Query() query: ListTicketsQueryDto) {
    return this.ticketQueryService.listTickets(query);
  }

  @Get("/me/owned")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "List the authenticated user's owned tickets",
    description:
      "Returns tickets currently owned by the authenticated attendee, with optional status and event filtering.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Optional ticket status filter",
  })
  @ApiQuery({
    name: "eventSlug",
    required: false,
    description: "Optional event slug filter",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    description: "Sort direction by event start time",
    enum: ["asc", "desc"],
  })
  @ApiOkResponse({
    description: "Authenticated user's owned tickets",
    type: TicketSummaryResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  getMyTickets(
    @Query() query: ListMyTicketsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketQueryService.listMyTickets(query, user);
  }

  @Get("/me/owned/:serialNumber")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get an owned ticket by serial number",
    description:
      "Returns full ticket ownership context only when the authenticated attendee is the current owner.",
  })
  @ApiParam({
    name: "serialNumber",
    description: "Ticket serial number",
    example: "CNT-GA-0001",
  })
  @ApiOkResponse({
    description: "Authenticated user's ticket detail",
    type: TicketDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Owned ticket was not found",
  })
  getMyTicket(
    @Param("serialNumber") serialNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketQueryService.getMyTicketBySerialNumber(serialNumber, user);
  }

  @Get("events/:eventId/:serialNumber/issue")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard, EventMembershipGuard)
  @RequireEventRoles(StaffRole.OWNER, StaffRole.ADMIN, StaffRole.SCANNER)
  @ApiOperation({
    summary: "Get event-scoped ticket issue detail",
    description:
      "Returns detailed current-state ticket context for authorized organizer or scanner staff investigating an event ticket issue.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiParam({
    name: "serialNumber",
    description: "Ticket serial number",
    example: "CNT-GA-0002",
  })
  @ApiOkResponse({
    description: "Operational ticket issue detail",
    type: TicketDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Ticket detail request was invalid for the current event context",
  })
  @ApiNotFoundResponse({
    description: "Ticket was not found for the provided event",
  })
  getOperationalTicketIssue(
    @Param("eventId") eventId: string,
    @Param("serialNumber") serialNumber: string,
  ) {
    return this.ticketQueryService.getOperationalTicketBySerialNumber(
      eventId,
      serialNumber,
    );
  }

  @Get(":serialNumber")
  @ApiOperation({
    summary: "Get ticket by serial number",
    description:
      "Returns detailed ticket context, including ownership history and latest transfer or resale state.",
  })
  @ApiParam({
    name: "serialNumber",
    description: "Ticket serial number",
    example: "CNT-GA-0002",
  })
  @ApiOkResponse({
    description: "Detailed ticket response",
    type: TicketDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Ticket was not found",
  })
  getTicket(@Param("serialNumber") serialNumber: string) {
    return this.ticketQueryService.getTicketBySerialNumber(serialNumber);
  }
}
