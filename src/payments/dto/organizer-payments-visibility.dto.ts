import { ApiProperty } from "@nestjs/swagger";

export class OrganizerPaymentTransactionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizerId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventTitle!: string;

  @ApiProperty({ nullable: true })
  orderId!: string | null;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  grossAmount!: string;

  @ApiProperty()
  platformFeeAmount!: string;

  @ApiProperty()
  organizerNetAmount!: string;

  @ApiProperty()
  settlementState!: string;

  @ApiProperty({ nullable: true })
  connectedAccountId!: string | null;

  @ApiProperty({ nullable: true })
  providerPaymentIntentId!: string | null;

  @ApiProperty({ nullable: true })
  providerChargeId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class OrganizerRefundSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentTransactionId!: string;

  @ApiProperty({ nullable: true })
  orderId!: string | null;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventTitle!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  providerRefundId!: string | null;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  reverseTransfer!: boolean;

  @ApiProperty()
  refundApplicationFee!: boolean;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  requestedAt!: Date;

  @ApiProperty({ nullable: true })
  processedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class OrganizerDisputeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentTransactionId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventTitle!: string;

  @ApiProperty()
  providerDisputeId!: string;

  @ApiProperty({ nullable: true })
  providerChargeId!: string | null;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  evidenceDueBy!: Date | null;

  @ApiProperty()
  needsResponse!: boolean;

  @ApiProperty({ nullable: true })
  wonAt!: Date | null;

  @ApiProperty({ nullable: true })
  lostAt!: Date | null;

  @ApiProperty({ nullable: true })
  closedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class OrganizerPayoutVisibilitySummaryDto {
  @ApiProperty()
  organizerId!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  grossSales!: string;

  @ApiProperty()
  platformFees!: string;

  @ApiProperty()
  netEarnings!: string;

  @ApiProperty()
  pendingSettlement!: string;

  @ApiProperty()
  onHoldAmount!: string;

  @ApiProperty()
  settledAmount!: string;

  @ApiProperty()
  refundedAmount!: string;

  @ApiProperty()
  disputeExposureAmount!: string;

  @ApiProperty()
  successfulTransactionCount!: number;

  @ApiProperty()
  pendingTransactionCount!: number;

  @ApiProperty()
  onHoldTransactionCount!: number;

  @ApiProperty()
  refundCount!: number;

  @ApiProperty()
  disputeCount!: number;

  @ApiProperty({ nullable: true })
  lastTransactionAt!: Date | null;
}
