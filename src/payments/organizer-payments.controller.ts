import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
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
  OrganizerDisputeSummaryDto,
  OrganizerPaymentTransactionSummaryDto,
  OrganizerPayoutVisibilitySummaryDto,
  OrganizerRefundSummaryDto,
} from "./dto/organizer-payments-visibility.dto";
import { OrganizerPaymentsQueryDto } from "./dto/organizer-payments-query.dto";
import {
  StripeConnectAccountResponseDto,
  StripeConnectLinkResponseDto,
} from "./dto/stripe-connect-account-response.dto";
import { StripeConnectLinkDto } from "./dto/stripe-connect-link.dto";
import { OrganizerPaymentsQueryService } from "./organizer-payments-query.service";
import { OrganizerStripeAccountService } from "./organizer-stripe-account.service";

@ApiTags("payments")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("payments/stripe")
export class OrganizerPaymentsController {
  constructor(
    private readonly organizerPaymentsQueryService: OrganizerPaymentsQueryService,
    private readonly organizerStripeAccountService: OrganizerStripeAccountService,
  ) {}

  @Get("account")
  @ApiOperation({
    summary: "Get organizer Stripe Connect account status",
  })
  @ApiOkResponse({
    type: StripeConnectAccountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Authentication required",
  })
  async getAccount(@CurrentUser() user: AuthenticatedUser) {
    const account = await this.organizerStripeAccountService.getAccountStatus(user);

    return {
      ...account,
      requirements: {
        currentlyDue: account.currentlyDueRequirements,
        eventuallyDue: account.eventuallyDueRequirements,
        pastDue: account.pastDueRequirements,
      },
    };
  }

  @Get("status")
  @ApiOperation({
    summary: "Alias for organizer Stripe Connect readiness status",
  })
  @ApiOkResponse({
    type: StripeConnectAccountResponseDto,
  })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.getAccount(user);
  }

  @Post("connect")
  @ApiOperation({
    summary: "Create or resume Stripe Connect onboarding",
  })
  @ApiOkResponse({
    type: StripeConnectLinkResponseDto,
  })
  async connect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: StripeConnectLinkDto,
  ) {
    const result = await this.organizerStripeAccountService.createOrResumeOnboarding(
      user,
      payload,
    );

    return {
      ...result,
      account: {
        ...result.account,
        requirements: {
          currentlyDue: result.account.currentlyDueRequirements,
          eventuallyDue: result.account.eventuallyDueRequirements,
          pastDue: result.account.pastDueRequirements,
        },
      },
    };
  }

  @Post("onboarding-link")
  @ApiOperation({
    summary: "Generate a fresh Stripe onboarding link",
  })
  @ApiOkResponse({
    type: StripeConnectLinkResponseDto,
  })
  createOnboardingLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: StripeConnectLinkDto,
  ) {
    return this.connect(user, payload);
  }

  @Post("refresh")
  @ApiOperation({
    summary: "Refresh Stripe onboarding after expiry or action required",
  })
  @ApiOkResponse({
    type: StripeConnectLinkResponseDto,
  })
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: StripeConnectLinkDto,
  ) {
    const result = await this.organizerStripeAccountService.refreshOnboarding(
      user,
      payload,
    );

    return {
      ...result,
      account: {
        ...result.account,
        requirements: {
          currentlyDue: result.account.currentlyDueRequirements,
          eventuallyDue: result.account.eventuallyDueRequirements,
          pastDue: result.account.pastDueRequirements,
        },
      },
    };
  }

  @Get("transactions")
  @ApiOperation({
    summary: "List organizer payment transactions",
  })
  @ApiOkResponse({
    type: OrganizerPaymentTransactionSummaryDto,
    isArray: true,
  })
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerPaymentsQueryDto,
  ) {
    return this.organizerPaymentsQueryService.listOrganizerTransactions(
      user.id,
      query.limit ?? 25,
    );
  }

  @Get("refunds")
  @ApiOperation({
    summary: "List organizer refunds",
  })
  @ApiOkResponse({
    type: OrganizerRefundSummaryDto,
    isArray: true,
  })
  async listRefunds(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerPaymentsQueryDto,
  ) {
    return this.organizerPaymentsQueryService.listOrganizerRefunds(
      user.id,
      query.limit ?? 25,
    );
  }

  @Get("disputes")
  @ApiOperation({
    summary: "List organizer disputes",
  })
  @ApiOkResponse({
    type: OrganizerDisputeSummaryDto,
    isArray: true,
  })
  async listDisputes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerPaymentsQueryDto,
  ) {
    return this.organizerPaymentsQueryService.listOrganizerDisputes(
      user.id,
      query.limit ?? 25,
    );
  }

  @Get("payout-visibility")
  @ApiOperation({
    summary: "Get organizer payout visibility summary",
  })
  @ApiOkResponse({
    type: OrganizerPayoutVisibilitySummaryDto,
  })
  getPayoutVisibility(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerPaymentsQueryService.getOrganizerPayoutVisibility(user.id);
  }
}
