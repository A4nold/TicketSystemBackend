import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: "buyer_abandoned_checkout",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
