import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUrl } from "class-validator";

export class StripeConnectLinkDto {
  @ApiPropertyOptional({
    description: "Optional return URL after successful Stripe onboarding.",
    example: "https://maya.app/organizer/payments/stripe/return",
  })
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  returnUrl?: string;

  @ApiPropertyOptional({
    description: "Optional refresh URL used when Stripe onboarding must be restarted.",
    example: "https://maya.app/organizer/payments/stripe/refresh",
  })
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  refreshUrl?: string;
}
