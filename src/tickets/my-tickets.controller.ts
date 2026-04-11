import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
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
import { ListMyTicketsQueryDto } from "./dto/list-my-tickets-query.dto";
import {
  TicketDetailResponseDto,
  TicketSummaryResponseDto,
} from "./dto/ticket-response.dto";
import { TicketQueryService } from "./ticket-query.service";
import { TicketsService } from "./tickets.service";

@ApiTags("tickets")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("me/tickets")
export class MyTicketsController {
  constructor(private readonly ticketQueryService: TicketQueryService) {}

  @Get()
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

  @Get(":serialNumber")
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
}
