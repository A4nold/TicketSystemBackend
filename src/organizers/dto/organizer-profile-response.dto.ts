import { ApiProperty } from "@nestjs/swagger";

export class OrganizerProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  businessName!: string | null;

  @ApiProperty({ nullable: true })
  country!: string | null;

  @ApiProperty({ nullable: true })
  defaultPayoutCurrency!: string | null;

  @ApiProperty({
    enum: ["STRIPE", "PAYSTACK", "MANUAL"],
    nullable: true,
  })
  selectedPaymentProvider!: string | null;

  @ApiProperty({
    enum: ["STRIPE", "PAYSTACK", "MANUAL"],
    nullable: true,
  })
  recommendedProvider!: string | null;

  @ApiProperty({
    enum: ["AUTO_RECOMMENDED", "MANUAL"],
    nullable: true,
  })
  providerSelectionSource!: string | null;

  @ApiProperty({ nullable: true })
  providerSelectedAt!: Date | null;

  @ApiProperty({
    enum: [
      "NOT_STARTED",
      "PROFILE_INCOMPLETE",
      "PROFILE_COMPLETED",
      "PAYMENT_SETUP_PENDING",
      "READY_FOR_PAID_EVENTS",
    ],
  })
  onboardingStatus!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
