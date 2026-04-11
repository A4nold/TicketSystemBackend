import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { IncomingTransferResponseDto } from "./dto/incoming-transfer-response.dto";
import { TicketQueryService } from "./ticket-query.service";
import { TicketsService } from "./tickets.service";

@ApiTags("tickets")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("me")
export class MyTransferInboxController {
  constructor(private readonly ticketQueryService: TicketQueryService) {}

  @Get("transfer-inbox")
  @ApiOperation({
    summary: "List pending incoming transfers for the authenticated attendee",
    description:
      "Returns transfer requests addressed to the authenticated attendee by user id or recipient email.",
  })
  @ApiOkResponse({
    description: "Authenticated user's pending incoming transfers",
    type: IncomingTransferResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  getIncomingTransfers(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketQueryService.listIncomingTransfers(user);
  }
}
