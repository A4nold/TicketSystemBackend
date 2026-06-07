import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class StripeRequirementSummaryDto {
  @ApiProperty({ type: [String] })
  currentlyDue!: string[];

  @ApiProperty({ type: [String] })
  eventuallyDue!: string[];

  @ApiProperty({ type: [String] })
  pastDue!: string[];
}

export class StripeConnectAccountResponseDto {
  @ApiProperty()
  organizerId!: string;

  @ApiPropertyOptional({ nullable: true })
  connectedAccountId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  status!: string | null;

  @ApiPropertyOptional({ nullable: true })
  onboardingStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  verificationStatus!: string | null;

  @ApiProperty()
  chargesEnabled!: boolean;

  @ApiProperty()
  payoutsEnabled!: boolean;

  @ApiProperty()
  detailsSubmitted!: boolean;

  @ApiPropertyOptional({ nullable: true })
  country!: string | null;

  @ApiPropertyOptional({ nullable: true })
  defaultCurrency!: string | null;

  @ApiPropertyOptional({ nullable: true })
  disabledReason!: string | null;

  @ApiProperty()
  isReadyForPaidEvents!: boolean;

  @ApiProperty({ type: StripeRequirementSummaryDto })
  requirements!: StripeRequirementSummaryDto;

  @ApiPropertyOptional({ nullable: true })
  onboardingCompletedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  readinessCheckedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  firstReadyAt!: Date | null;
}

export class StripeConnectLinkResponseDto {
  @ApiProperty({ type: StripeConnectAccountResponseDto })
  account!: StripeConnectAccountResponseDto;

  @ApiProperty()
  onboardingUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: Date | null;
}
