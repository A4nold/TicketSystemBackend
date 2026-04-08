import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmPaymentDto {
  @ApiPropertyOptional({
    example: "pay_demo_001",
    description: "External payment reference from the payment provider",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @ApiPropertyOptional({
    example: "cs_demo_001",
    description: "Checkout session identifier returned by the payment provider",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  checkoutSessionId?: string;
}
