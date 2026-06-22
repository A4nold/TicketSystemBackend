import { Injectable } from "@nestjs/common";
import { Prisma, SettlementState } from "@prisma/client";

import { OrganizerEarningRepository } from "./repositories/organizer-earning.repository";
import { PaymentAccountRepository } from "./repositories/payment-account.repository";
import { PaymentTransactionRepository } from "./repositories/payment-transaction.repository";
import { RefundRepository } from "./repositories/refund.repository";
import { DisputeRepository } from "./repositories/dispute.repository";
import {
  OrganizerPaystackAccountReadiness,
  OrganizerDisputeSummary,
  OrganizerPayoutVisibilitySummary,
  OrganizerRefundSummary,
  OrganizerPaymentTransactionSummary,
  OrganizerStripeAccountReadiness,
} from "./types/organizer-payment-readiness.type";

@Injectable()
export class OrganizerPaymentsQueryService {
  constructor(
    private readonly paymentAccountRepository: PaymentAccountRepository,
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly refundRepository: RefundRepository,
    private readonly disputeRepository: DisputeRepository,
    private readonly organizerEarningRepository: OrganizerEarningRepository,
  ) {}

  async getOrganizerStripeReadiness(
    organizerId: string,
  ): Promise<OrganizerStripeAccountReadiness> {
    const [profile, stripeAccount] = await Promise.all([
      this.paymentAccountRepository.findOrganizerPaymentProfile(organizerId),
      this.paymentAccountRepository.findStripeAccountByOrganizerId(organizerId),
    ]);

    return {
      organizerId,
      connectedAccountId: stripeAccount?.externalAccountId ?? null,
      accountType: stripeAccount?.accountType ?? null,
      status: stripeAccount?.status ?? null,
      onboardingStatus: stripeAccount?.onboardingStatus ?? null,
      verificationStatus: stripeAccount?.verificationStatus ?? null,
      chargesEnabled: stripeAccount?.chargesEnabled ?? false,
      payoutsEnabled: stripeAccount?.payoutsEnabled ?? false,
      detailsSubmitted: stripeAccount?.detailsSubmitted ?? false,
      country: stripeAccount?.country ?? null,
      defaultCurrency: stripeAccount?.defaultCurrency ?? null,
      currentlyDueRequirements: stripeAccount?.currentlyDueRequirements ?? [],
      eventuallyDueRequirements: stripeAccount?.eventuallyDueRequirements ?? [],
      pastDueRequirements: stripeAccount?.pastDueRequirements ?? [],
      disabledReason: stripeAccount?.disabledReason ?? null,
      onboardingCompletedAt: stripeAccount?.onboardingCompletedAt ?? null,
      lastSyncedAt: stripeAccount?.lastSyncedAt ?? null,
      isReadyForPaidEvents: profile?.isReadyForPaidEvents ?? false,
      readinessCheckedAt: profile?.readinessCheckedAt ?? null,
      firstReadyAt: profile?.firstReadyAt ?? null,
    };
  }

  async getOrganizerPaystackReadiness(
    organizerId: string,
  ): Promise<OrganizerPaystackAccountReadiness> {
    const [profile, paystackAccount] = await Promise.all([
      this.paymentAccountRepository.findOrganizerPaymentProfile(organizerId),
      this.paymentAccountRepository.findPaystackAccountByOrganizerId(organizerId),
    ]);

    const paystackMetadata =
      paystackAccount?.metadata &&
      typeof paystackAccount.metadata === "object" &&
      !Array.isArray(paystackAccount.metadata)
        ? ((paystackAccount.metadata as Record<string, unknown>).paystack as
            | Record<string, unknown>
            | undefined)
        : undefined;

    return {
      organizerId,
      payoutAccountCode: paystackAccount?.externalAccountCode ?? null,
      status: paystackAccount?.status ?? null,
      onboardingStatus: paystackAccount?.onboardingStatus ?? null,
      verificationStatus: paystackAccount?.verificationStatus ?? null,
      payoutsEnabled: paystackAccount?.payoutsEnabled ?? false,
      chargesEnabled: paystackAccount?.chargesEnabled ?? false,
      detailsSubmitted: paystackAccount?.detailsSubmitted ?? false,
      country: paystackAccount?.country ?? null,
      defaultCurrency: paystackAccount?.defaultCurrency ?? null,
      disabledReason: paystackAccount?.disabledReason ?? null,
      isReadyForPaidEvents: profile?.isReadyForPaidEvents ?? false,
      onboardingCompletedAt: paystackAccount?.onboardingCompletedAt ?? null,
      lastSyncedAt: paystackAccount?.lastSyncedAt ?? null,
      readinessCheckedAt: profile?.readinessCheckedAt ?? null,
      firstReadyAt: profile?.firstReadyAt ?? null,
      requirementsSummary: paystackAccount?.requirementsSummary ?? null,
      businessName:
        typeof paystackMetadata?.businessName === "string"
          ? paystackMetadata.businessName
          : null,
      accountHolderName:
        typeof paystackMetadata?.accountHolderName === "string"
          ? paystackMetadata.accountHolderName
          : null,
      bankCode:
        typeof paystackMetadata?.bankCode === "string" ? paystackMetadata.bankCode : null,
      maskedAccountNumber:
        typeof paystackMetadata?.maskedAccountNumber === "string"
          ? paystackMetadata.maskedAccountNumber
          : null,
      settlementSchedule:
        typeof paystackMetadata?.settlementSchedule === "string"
          ? paystackMetadata.settlementSchedule
          : null,
      isVerified: paystackMetadata?.isVerified === true,
      isActive: paystackMetadata?.isActive === true,
    };
  }

  async listOrganizerTransactions(
    organizerId: string,
    limit = 50,
  ): Promise<OrganizerPaymentTransactionSummary[]> {
    const transactions =
      await this.paymentTransactionRepository.listByOrganizerId(organizerId, limit);

    return transactions.map((transaction) => ({
      id: transaction.id,
      organizerId: transaction.organizerId,
      eventId: transaction.eventId,
      eventTitle: transaction.event.title,
      orderId: transaction.orderId,
      provider: transaction.provider,
      type: transaction.type,
      status: transaction.status,
      currency: transaction.currency,
      amount: transaction.amount.toFixed(2),
      grossAmount: transaction.grossAmount.toFixed(2),
      platformFeeAmount: transaction.platformFeeAmount.toFixed(2),
      organizerNetAmount: transaction.organizerNetAmount.toFixed(2),
      settlementState: transaction.settlementState,
      connectedAccountId: transaction.connectedAccountId,
      providerPaymentIntentId: transaction.providerPaymentIntentId,
      providerChargeId: transaction.providerChargeId,
      createdAt: transaction.createdAt,
    }));
  }

  async listOrganizerRefunds(
    organizerId: string,
    limit = 50,
  ): Promise<OrganizerRefundSummary[]> {
    const refunds = await this.refundRepository.listByOrganizerId(organizerId, limit);

    return refunds.map((refund) => ({
      id: refund.id,
      paymentTransactionId: refund.paymentTransactionId ?? "",
      orderId: refund.orderId,
      eventId: refund.paymentTransaction?.eventId ?? "",
      eventTitle: refund.paymentTransaction?.event.title ?? "Unknown event",
      status: refund.status,
      providerRefundId: refund.providerRefundId,
      amount: refund.amount.toFixed(2),
      currency: refund.currency,
      reverseTransfer: refund.reverseTransfer,
      refundApplicationFee: refund.refundApplicationFee,
      reason: refund.reason,
      requestedAt: refund.requestedAt,
      processedAt: refund.processedAt,
      createdAt: refund.createdAt,
    }));
  }

  async listOrganizerDisputes(
    organizerId: string,
    limit = 50,
  ): Promise<OrganizerDisputeSummary[]> {
    const disputes = await this.disputeRepository.listByOrganizerId(organizerId, limit);

    return disputes.map((dispute) => ({
      id: dispute.id,
      paymentTransactionId: dispute.paymentTransactionId,
      eventId: dispute.paymentTransaction.eventId,
      eventTitle: dispute.paymentTransaction.event.title,
      providerDisputeId: dispute.providerDisputeId,
      providerChargeId: dispute.providerChargeId,
      amount: dispute.amount.toFixed(2),
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      evidenceDueBy: dispute.evidenceDueBy,
      needsResponse: dispute.needsResponse,
      wonAt: dispute.wonAt,
      lostAt: dispute.lostAt,
      closedAt: dispute.closedAt,
      createdAt: dispute.createdAt,
    }));
  }

  async getOrganizerPayoutVisibility(
    organizerId: string,
  ): Promise<OrganizerPayoutVisibilitySummary> {
    const [transactions, earnings, refunds, disputes] = await Promise.all([
      this.paymentTransactionRepository.listByOrganizerId(organizerId, 100),
      this.organizerEarningRepository.listByOrganizerId(organizerId, 100),
      this.refundRepository.listByOrganizerId(organizerId, 100),
      this.disputeRepository.listByOrganizerId(organizerId, 100),
    ]);
    const succeededTransactions = transactions.filter(
      (transaction) => transaction.status === "SUCCEEDED",
    );

    const currency =
      succeededTransactions[0]?.currency ??
      transactions[0]?.currency ??
      earnings[0]?.currency ??
      refunds[0]?.currency ??
      disputes[0]?.currency ??
      "EUR";
    const grossSales = succeededTransactions.reduce(
      (sum, transaction) => sum.add(transaction.grossAmount),
      new Prisma.Decimal(0),
    );
    const platformFees = succeededTransactions.reduce(
      (sum, transaction) => sum.add(transaction.platformFeeAmount),
      new Prisma.Decimal(0),
    );
    const netEarnings = succeededTransactions.reduce(
      (sum, transaction) => sum.add(transaction.organizerNetAmount),
      new Prisma.Decimal(0),
    );
    const pendingSettlement = earnings
      .filter((earning) => earning.settlementState === SettlementState.PENDING)
      .reduce((sum, earning) => sum.add(earning.netAmount), new Prisma.Decimal(0));
    const onHoldAmount = earnings
      .filter((earning) => earning.settlementState === SettlementState.ON_HOLD)
      .reduce((sum, earning) => sum.add(earning.netAmount), new Prisma.Decimal(0));
    const settledAmount = earnings
      .filter((earning) => earning.settlementState === SettlementState.SETTLED)
      .reduce((sum, earning) => sum.add(earning.netAmount), new Prisma.Decimal(0));
    const refundedAmount = refunds
      .filter((refund) => refund.status === "SUCCEEDED")
      .reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    const disputeExposureAmount = disputes.reduce(
      (sum, dispute) => sum.add(dispute.amount),
      new Prisma.Decimal(0),
    );

    return {
      organizerId,
      currency,
      grossSales: grossSales.toFixed(2),
      platformFees: platformFees.toFixed(2),
      netEarnings: netEarnings.toFixed(2),
      pendingSettlement: pendingSettlement.toFixed(2),
      onHoldAmount: onHoldAmount.toFixed(2),
      settledAmount: settledAmount.toFixed(2),
      refundedAmount: refundedAmount.toFixed(2),
      disputeExposureAmount: disputeExposureAmount.toFixed(2),
      successfulTransactionCount: succeededTransactions.length,
      pendingTransactionCount: transactions.filter(
        (transaction) =>
          transaction.status === "PENDING" || transaction.status === "PROCESSING",
      ).length,
      onHoldTransactionCount: transactions.filter(
        (transaction) => transaction.settlementState === SettlementState.ON_HOLD,
      ).length,
      refundCount: refunds.length,
      disputeCount: disputes.length,
      lastTransactionAt: transactions[0]?.createdAt ?? null,
    };
  }
}
