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
import { BuyResaleListingDto } from "./dto/buy-resale-listing.dto";
import { CancelResaleListingDto } from "./dto/cancel-resale-listing.dto";
import { CreateResaleListingDto } from "./dto/create-resale-listing.dto";
import { ResaleResponseDto } from "./dto/resale-response.dto";
import { ResaleService } from "./resale.service";

@ApiTags("resale")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("tickets/:serialNumber")
export class ResaleController {
  constructor(private readonly resaleService: ResaleService) {}

  @Post("resale")
  @ApiOperation({
    summary: "Create a resale listing for a ticket",
    description:
      "Lists a ticket for controlled resale after validating organizer resale policy and current ticket state.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0003",
  })
  @ApiCreatedResponse({
    description: "Resale listing created",
    type: ResaleResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Listing could not be created",
  })
  @ApiNotFoundResponse({
    description: "Ticket was not found",
  })
  createListing(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CreateResaleListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resaleService.createListing(serialNumber, payload, user);
  }

  @Post("buy-resale")
  @ApiOperation({
    summary: "Buy an active resale listing",
    description:
      "Purchases an active listing, transfers ticket ownership, and returns the ticket to an issued state.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0003",
  })
  @ApiCreatedResponse({
    description: "Resale listing purchased",
    type: ResaleResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Listing could not be purchased",
  })
  @ApiNotFoundResponse({
    description: "Ticket or buyer was not found",
  })
  buyListing(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: BuyResaleListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resaleService.buyListing(serialNumber, payload, user);
  }

  @Post("cancel-resale")
  @ApiOperation({
    summary: "Cancel an active resale listing",
    description:
      "Cancels an active resale listing and restores the ticket to an issued state.",
  })
  @ApiParam({
    name: "serialNumber",
    example: "CNT-GA-0003",
  })
  @ApiCreatedResponse({
    description: "Resale listing cancelled",
    type: ResaleResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Listing could not be cancelled",
  })
  @ApiNotFoundResponse({
    description: "Ticket was not found",
  })
  cancelListing(
    @Param("serialNumber") serialNumber: string,
    @Body() payload: CancelResaleListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resaleService.cancelListing(serialNumber, payload, user);
  }
}
