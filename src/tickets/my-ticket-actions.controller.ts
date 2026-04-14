import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ResaleResponseDto } from "../resale/dto/resale-response.dto";
import { ResaleService } from "../resale/resale.service";
import { CreateResaleListingDto } from "../resale/dto/create-resale-listing.dto";
import { CancelResaleListingDto } from "../resale/dto/cancel-resale-listing.dto";
import { CreateTransferDto } from "../transfers/dto/create-transfer.dto";
import { TransferResponseDto } from "../transfers/dto/transfer-response.dto";
import { CancelTransferDto } from "../transfers/dto/cancel-transfer.dto";
import { TransfersService } from "../transfers/transfers.service";
import { TicketQrPayloadResponseDto } from "./dto/ticket-qr-response.dto";
import { TicketsService } from "./tickets.service";

@ApiTags("tickets")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("me/tickets/:serialNumber")
export class MyTicketActionsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly transfersService: TransfersService,
    private readonly resaleService: ResaleService,
  ) {}

  @Get("qr")
  @ApiOperation({
    summary: "Get the QR payload for an owned ticket",
    description:
      "Returns the current QR payload for the authenticated attendee's owned ticket.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0001",
  })
  @ApiOkResponse({
    description: "Current ticket QR payload",
    type: TicketQrPayloadResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Owned ticket was not found",
  })
  getTicketQr(
    @Param("serialNumber") serialNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.getMyTicketQrPayload(serialNumber, user);
  }

  @Post("transfer")
  @ApiOperation({
    summary: "Create a transfer request for an owned ticket",
    description:
      "Creates a transfer request from the authenticated attendee's currently owned ticket.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0001",
  })
  @ApiCreatedResponse({
    description: "Transfer request created",
    type: TransferResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Transfer request could not be created",
  })
  createTransfer(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CreateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.createTransfer(serialNumber, payload, user);
  }

  @Post("cancel-transfer")
  @ApiOperation({
    summary: "Cancel a transfer request for an owned ticket",
    description:
      "Cancels the active transfer request for the authenticated attendee's currently owned ticket.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0002",
  })
  @ApiCreatedResponse({
    description: "Transfer cancelled",
    type: TransferResponseDto,
  })
  cancelTransfer(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CancelTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.cancelTransfer(serialNumber, payload, user);
  }

  @Post("remind-transfer")
  @ApiOperation({
    summary: "Send a reminder for a pending transfer",
    description:
      "Re-notifies the pending transfer recipient when the authenticated attendee is the original sender.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0002",
  })
  @ApiCreatedResponse({
    description: "Transfer reminder sent",
    type: TransferResponseDto,
  })
  remindTransfer(
    @Param("serialNumber") serialNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.remindTransfer(serialNumber, user);
  }

  @Post("resale")
  @ApiOperation({
    summary: "Create a resale listing for an owned ticket",
    description:
      "Creates a controlled resale listing from the authenticated attendee's currently owned ticket.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0003",
  })
  @ApiCreatedResponse({
    description: "Resale listing created",
    type: ResaleResponseDto,
  })
  createResale(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CreateResaleListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resaleService.createListing(serialNumber, payload, user);
  }

  @Post("cancel-resale")
  @ApiOperation({
    summary: "Cancel a resale listing for an owned ticket",
    description:
      "Cancels the active resale listing for the authenticated attendee's currently owned ticket.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0003",
  })
  @ApiCreatedResponse({
    description: "Resale listing cancelled",
    type: ResaleResponseDto,
  })
  cancelResale(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CancelResaleListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resaleService.cancelListing(serialNumber, payload, user);
  }
}
