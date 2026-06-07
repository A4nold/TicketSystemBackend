import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
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
import {
  PaymentProviderCapabilityMatrixResponseDto,
  PaymentProviderAvailabilityResponseDto,
  SelectPaymentProviderDto,
} from "./dto/payment-provider-availability.dto";
import { OrganizerProfileResponseDto } from "./dto/organizer-profile-response.dto";
import { OrganizerPaymentProviderService } from "./organizer-payment-provider.service";

@ApiTags("payments")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("payments")
export class OrganizerPaymentProviderController {
  constructor(
    private readonly organizerPaymentProviderService: OrganizerPaymentProviderService,
  ) {}

  @Get("providers/availability")
  @ApiOperation({
    summary: "Get organizer payout provider availability and recommendation",
  })
  @ApiOkResponse({
    type: PaymentProviderAvailabilityResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Authentication required",
  })
  getAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerPaymentProviderService.getAvailability(user);
  }

  @Get("providers/capability-matrix")
  @ApiOperation({
    summary: "Get the current marketplace capability matrix for organizer payment providers",
  })
  @ApiOkResponse({
    type: PaymentProviderCapabilityMatrixResponseDto,
  })
  getCapabilityMatrix() {
    return this.organizerPaymentProviderService.getCapabilityMatrix();
  }

  @Post("provider-selection")
  @ApiOperation({
    summary: "Persist the organizer's selected payout provider",
  })
  @ApiOkResponse({
    type: OrganizerProfileResponseDto,
  })
  selectProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SelectPaymentProviderDto,
  ) {
    return this.organizerPaymentProviderService.selectProvider(user, payload.provider);
  }
}
