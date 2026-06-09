import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UpsertPaystackOrganizerAccountDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  businessName!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountHolderName?: string;

  @ApiProperty()
  @IsString()
  @Length(3, 10)
  bankCode!: string;

  @ApiProperty()
  @IsString()
  @Length(6, 20)
  accountNumber!: string;
}

export class PaystackOrganizerAccountResponseDto {
  @ApiProperty()
  organizerId!: string;

  @ApiPropertyOptional({ nullable: true })
  subaccountCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  status!: string | null;

  @ApiPropertyOptional({ nullable: true })
  onboardingStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  verificationStatus!: string | null;

  @ApiProperty()
  payoutsEnabled!: boolean;

  @ApiProperty()
  chargesEnabled!: boolean;

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

  @ApiPropertyOptional({ nullable: true })
  onboardingCompletedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  readinessCheckedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  firstReadyAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  requirementsSummary!: string | null;

  @ApiPropertyOptional({ nullable: true })
  businessName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountHolderName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bankCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  maskedAccountNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  settlementSchedule!: string | null;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  isActive!: boolean;
}

export class ResolvePaystackBankAccountDto {
  @ApiProperty()
  @IsString()
  @Length(3, 10)
  bankCode!: string;

  @ApiProperty()
  @IsString()
  @Length(6, 20)
  accountNumber!: string;
}

export class PaystackBankSummaryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  slug!: string | null;
}

export class ResolvePaystackBankAccountResponseDto {
  @ApiProperty()
  accountName!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  bankCode!: string;

  @ApiPropertyOptional({ nullable: true })
  bankId!: number | null;
}
