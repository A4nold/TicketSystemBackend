import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class StripeConnectLinkDto {
  @ApiPropertyOptional({
    description: "Optional return URL after successful Stripe onboarding.",
    example: "ticketsystem://organizer/setup?stripe_return=1",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;

  @ApiPropertyOptional({
    description: "Optional refresh URL used when Stripe onboarding must be restarted.",
    example: "ticketsystem://organizer/setup?stripe_refresh=1",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshUrl?: string;
}
