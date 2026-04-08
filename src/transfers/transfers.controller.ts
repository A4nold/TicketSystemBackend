import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { AcceptTransferDto } from "./dto/accept-transfer.dto";
import { CancelTransferDto } from "./dto/cancel-transfer.dto";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { TransferResponseDto } from "./dto/transfer-response.dto";
import { TransfersService } from "./transfers.service";

@ApiTags("transfers")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("tickets/:serialNumber")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post("transfer")
  @ApiOperation({
    summary: "Create a transfer request for a ticket",
    description:
      "Marks the ticket as transfer pending and creates a platform-managed transfer request.",
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
  @ApiNotFoundResponse({
    description: "Ticket was not found",
  })
  createTransfer(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CreateTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.createTransfer(serialNumber, payload, user);
  }

  @Post("accept-transfer")
  @ApiOperation({
    summary: "Accept a pending ticket transfer",
    description:
      "Completes the ownership handoff, increments the ownership revision, and rotates the QR token.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0002",
  })
  @ApiCreatedResponse({
    description: "Transfer accepted",
    type: TransferResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Transfer could not be accepted",
  })
  @ApiNotFoundResponse({
    description: "Ticket or recipient was not found",
  })
  acceptTransfer(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: AcceptTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.acceptTransfer(serialNumber, payload, user);
  }

  @Post("cancel-transfer")
  @ApiOperation({
    summary: "Cancel a pending ticket transfer",
    description:
      "Cancels the pending transfer request and restores the ticket to an issued state.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0002",
  })
  @ApiCreatedResponse({
    description: "Transfer cancelled",
    type: TransferResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Transfer could not be cancelled",
  })
  @ApiNotFoundResponse({
    description: "Ticket was not found",
  })
  cancelTransfer(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CancelTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfersService.cancelTransfer(serialNumber, payload, user);
  }
}
