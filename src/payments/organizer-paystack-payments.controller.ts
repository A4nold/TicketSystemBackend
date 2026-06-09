import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
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
  PaystackBankSummaryDto,
  PaystackOrganizerAccountResponseDto,
  ResolvePaystackBankAccountDto,
  ResolvePaystackBankAccountResponseDto,
  UpsertPaystackOrganizerAccountDto,
} from "./dto/paystack-organizer-account.dto";
import { OrganizerPaystackAccountService } from "./organizer-paystack-account.service";

@ApiTags("payments")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("payments/paystack")
export class OrganizerPaystackPaymentsController {
  constructor(
    private readonly organizerPaystackAccountService: OrganizerPaystackAccountService,
  ) {}

  @Get("account")
  @ApiOperation({
    summary: "Get organizer Paystack payout account status",
  })
  @ApiOkResponse({
    type: PaystackOrganizerAccountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Authentication required",
  })
  getAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerPaystackAccountService.getAccountStatus(user);
  }

  @Get("banks")
  @ApiOperation({
    summary: "List Paystack payout banks for organizer onboarding",
  })
  @ApiOkResponse({
    type: PaystackBankSummaryDto,
    isArray: true,
  })
  listBanks(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerPaystackAccountService.listBanks(user);
  }

  @Post("resolve-account")
  @ApiOperation({
    summary: "Resolve a Paystack bank account for organizer onboarding",
  })
  @ApiOkResponse({
    type: ResolvePaystackBankAccountResponseDto,
  })
  resolveAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ResolvePaystackBankAccountDto,
  ) {
    return this.organizerPaystackAccountService.resolveBankAccount(user, payload);
  }

  @Post("account")
  @ApiOperation({
    summary: "Create organizer Paystack payout account draft",
  })
  @ApiOkResponse({
    type: PaystackOrganizerAccountResponseDto,
  })
  createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertPaystackOrganizerAccountDto,
  ) {
    return this.organizerPaystackAccountService.createAccount(user, payload);
  }

  @Patch("account")
  @ApiOperation({
    summary: "Update organizer Paystack payout account draft",
  })
  @ApiOkResponse({
    type: PaystackOrganizerAccountResponseDto,
  })
  updateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertPaystackOrganizerAccountDto,
  ) {
    return this.organizerPaystackAccountService.updateAccount(user, payload);
  }
}
