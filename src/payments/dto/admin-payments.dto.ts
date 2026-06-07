import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentProvider } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AdminWebhookFailureQueryDto {
  @ApiPropertyOptional({
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    default: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdminPaymentExceptionsQueryDto {
  @ApiPropertyOptional({
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class AdminPaymentRepairDto {
  @ApiPropertyOptional({
    example: "manual_support_review",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminWebhookFailureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  providerEventId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ nullable: true })
  processingError!: string | null;

  @ApiProperty()
  deliveryAttempts!: number;

  @ApiProperty({ nullable: true })
  lastAttemptAt!: Date | null;

  @ApiProperty({ nullable: true })
  processedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminStripeSyncResultDto {
  @ApiProperty()
  resourceType!: string;

  @ApiProperty()
  resourceId!: string;

  @ApiProperty()
  synced!: boolean;
}

export class AdminPaymentExceptionItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  severity!: "LOW" | "MEDIUM" | "HIGH";

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true })
  orderId!: string | null;

  @ApiProperty({ nullable: true })
  paymentTransactionId!: string | null;
}

export class AdminSettlementReconciliationSummaryDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  totalTransactions!: number;

  @ApiProperty()
  grossSales!: string;

  @ApiProperty()
  platformFees!: string;

  @ApiProperty()
  organizerNet!: string;

  @ApiProperty()
  organizerEarningsTotal!: string;

  @ApiProperty()
  settledEarnings!: string;

  @ApiProperty()
  onHoldEarnings!: string;

  @ApiProperty()
  refundedAmount!: string;

  @ApiProperty()
  disputeExposureAmount!: string;

  @ApiProperty()
  mismatchCount!: number;
}

export class AdminOrderRepairResultDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  repaired!: boolean;

  @ApiProperty()
  message!: string;
}
