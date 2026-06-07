import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateRefundDto {
  @ApiPropertyOptional({
    example: 5,
    description:
      "Optional partial refund amount in the order currency. Omit to refund the full remaining refundable amount.",
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({
    example: "requested_by_customer",
    description: "Optional refund reason captured locally and sent to Stripe when supported.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Whether organizer transfer funds should be reversed. Defaults to true for Connect refunds.",
  })
  @IsOptional()
  @IsBoolean()
  reverseTransfer?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      "Whether Maya's application fee should also be refunded. Defaults to true for full refunds and false for partial refunds.",
  })
  @IsOptional()
  @IsBoolean()
  refundApplicationFee?: boolean;
}
