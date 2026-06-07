import { ApiProperty } from "@nestjs/swagger";
import { RefundStatus } from "@prisma/client";

export class RefundResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  orderId!: string | null;

  @ApiProperty({ nullable: true })
  paymentTransactionId!: string | null;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

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

  @ApiProperty({ nullable: true })
  requestedByUserId!: string | null;

  @ApiProperty()
  requestedAt!: Date;

  @ApiProperty({ nullable: true })
  processedAt!: Date | null;

  @ApiProperty({ nullable: true })
  failedAt!: Date | null;

  @ApiProperty({ nullable: true })
  failureReason!: string | null;

  @ApiProperty({ nullable: true })
  createdAt!: Date | null;
}
