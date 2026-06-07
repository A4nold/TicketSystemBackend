import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminPaymentsGuard } from "./admin-payments.guard";
import { AdminPaymentsOperationsService } from "./admin-payments-operations.service";
import {
  AdminOrderRepairResultDto,
  AdminPaymentExceptionsQueryDto,
  AdminPaymentExceptionItemDto,
  AdminPaymentRepairDto,
  AdminSettlementReconciliationSummaryDto,
  AdminStripeSyncResultDto,
  AdminWebhookFailureDto,
  AdminWebhookFailureQueryDto,
} from "./dto/admin-payments.dto";

@ApiTags("admin-payments")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, AdminPaymentsGuard)
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(
    private readonly adminPaymentsOperationsService: AdminPaymentsOperationsService,
  ) {}

  @Get("webhook-failures")
  @ApiOperation({ summary: "List failed payment webhooks" })
  @ApiOkResponse({ type: AdminWebhookFailureDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Authentication required" })
  listWebhookFailures(@Query() query: AdminWebhookFailureQueryDto) {
    return this.adminPaymentsOperationsService.listWebhookFailures(
      query.limit ?? 25,
      query.provider,
    );
  }

  @Post("webhooks/:providerEventId/replay")
  @ApiOperation({ summary: "Replay a stored payment webhook" })
  replayWebhook(@Param("providerEventId") providerEventId: string) {
    return this.adminPaymentsOperationsService.replayWebhook(providerEventId);
  }

  @Post("stripe/accounts/:accountId/sync")
  @ApiOperation({ summary: "Sync a Stripe account from provider state" })
  @ApiOkResponse({ type: AdminStripeSyncResultDto })
  syncStripeAccount(@Param("accountId") accountId: string) {
    return this.adminPaymentsOperationsService.syncStripeAccount(accountId);
  }

  @Post("stripe/payment-intents/:paymentIntentId/sync")
  @ApiOperation({ summary: "Sync a Stripe payment intent from provider state" })
  @ApiOkResponse({ type: AdminStripeSyncResultDto })
  syncStripePaymentIntent(@Param("paymentIntentId") paymentIntentId: string) {
    return this.adminPaymentsOperationsService.syncStripePaymentIntent(paymentIntentId);
  }

  @Post("stripe/charges/:chargeId/sync")
  @ApiOperation({ summary: "Sync a Stripe charge from provider state" })
  @ApiOkResponse({ type: AdminStripeSyncResultDto })
  syncStripeCharge(@Param("chargeId") chargeId: string) {
    return this.adminPaymentsOperationsService.syncStripeCharge(chargeId);
  }

  @Post("stripe/refunds/:refundId/sync")
  @ApiOperation({ summary: "Sync a Stripe refund from provider state" })
  @ApiOkResponse({ type: AdminStripeSyncResultDto })
  syncStripeRefund(@Param("refundId") refundId: string) {
    return this.adminPaymentsOperationsService.syncStripeRefund(refundId);
  }

  @Post("stripe/disputes/:disputeId/sync")
  @ApiOperation({ summary: "Sync a Stripe dispute from provider state" })
  @ApiOkResponse({ type: AdminStripeSyncResultDto })
  syncStripeDispute(@Param("disputeId") disputeId: string) {
    return this.adminPaymentsOperationsService.syncStripeDispute(disputeId);
  }

  @Get("exceptions")
  @ApiOperation({ summary: "List payment operations exceptions" })
  @ApiOkResponse({ type: AdminPaymentExceptionItemDto, isArray: true })
  listPaymentExceptions(@Query() query: AdminPaymentExceptionsQueryDto) {
    return this.adminPaymentsOperationsService.listPaymentExceptions(query.limit ?? 50);
  }

  @Get("reconciliation/summary")
  @ApiOperation({ summary: "Get settlement reconciliation summary" })
  @ApiOkResponse({ type: AdminSettlementReconciliationSummaryDto })
  getSettlementReconciliationSummary() {
    return this.adminPaymentsOperationsService.getSettlementReconciliationSummary();
  }

  @Post("orders/:orderId/repair")
  @ApiOperation({ summary: "Repair a stuck order payment state" })
  @ApiOkResponse({ type: AdminOrderRepairResultDto })
  repairOrderPayment(
    @Param("orderId") orderId: string,
    @Body() _payload: AdminPaymentRepairDto,
  ) {
    return this.adminPaymentsOperationsService.repairOrderPayment(orderId);
  }
}
