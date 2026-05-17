import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewTicketOfferRequestDto {
  @ApiPropertyOptional({
    example: "Can you increase your offer slightly?",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  organizerNote?: string;
}

