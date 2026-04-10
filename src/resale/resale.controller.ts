import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { BuyResaleListingDto } from "./dto/buy-resale-listing.dto";
import { CancelResaleListingDto } from "./dto/cancel-resale-listing.dto";
import { CreateResaleListingDto } from "./dto/create-resale-listing.dto";
import { PublicResaleListingResponseDto } from "./dto/public-resale-listing-response.dto";
import { ResaleResponseDto } from "./dto/resale-response.dto";
import { ResaleService } from "./resale.service";

@ApiTags("resale")
@Controller()
export class ResaleController {
  constructor(private readonly resaleService: ResaleService) {}

  @Get("resale/events/:eventSlug/listings")
  @ApiOperation({
    summary: "List public resale listings for an event",
    description:
      "Returns active resale listings for a resale-enabled event so buyers can browse secondary-market inventory.",
  })
  @ApiParam({
    name: "eventSlug",
    example: "campus-neon-takeover",
  })
  @ApiOkResponse({
    description: "Public resale listings for an event",
    type: PublicResaleListingResponseDto,
    isArray: true,
  })
  listPublicListings(@Param("eventSlug") eventSlug: string) {
    return this.resaleService.listPublicListings(eventSlug);
  }

  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @Post("tickets/:serialNumber/resale")
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

  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @Post("tickets/:serialNumber/buy-resale")
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

  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @Post("tickets/:serialNumber/cancel-resale")
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
