import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumberString, IsOptional, IsString } from "class-validator";

export class CreateResaleListingDto {
  @ApiProperty({
    description: "Asking price for the resale listing",
    example: "18.00",
  })
  @IsNumberString()
  askingPrice!: string;

  @ApiPropertyOptional({
    description: "Optional explicit expiry timestamp for the listing",
    example: "2026-05-15T16:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
