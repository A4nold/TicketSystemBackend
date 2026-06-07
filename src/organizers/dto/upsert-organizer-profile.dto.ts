import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class UpsertOrganizerProfileDto {
  @ApiPropertyOptional({
    example: "Campus Night",
    description: "Public organizer display name shown in future organizer-facing experiences.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({
    example: "Campus Night Limited",
    description: "Legal or business name for the organizer.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessName?: string;

  @ApiPropertyOptional({
    example: "IE",
    description: "Two-letter country code for organizer operations.",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  country?: string;

  @ApiPropertyOptional({
    example: "EUR",
    description: "Preferred payout currency for organizer onboarding.",
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  defaultPayoutCurrency?: string;
}
