import { ApiProperty } from "@nestjs/swagger";
import { PaymentProvider } from "@prisma/client";
import { IsEnum } from "class-validator";

export class PaymentProviderAvailabilityItemDto {
  @ApiProperty({
    enum: ["STRIPE", "PAYSTACK", "MANUAL"],
  })
  provider!: string;

  @ApiProperty({
    enum: ["AVAILABLE", "UNAVAILABLE", "COMING_SOON"],
  })
  status!: string;

  @ApiProperty()
  supportsOnboarding!: boolean;

  @ApiProperty()
  supportsPayouts!: boolean;

  @ApiProperty()
  supportsCustomerCheckout!: boolean;

  @ApiProperty()
  supportsPlatformFeeAutomation!: boolean;

  @ApiProperty()
  supportsRefunds!: boolean;

  @ApiProperty()
  supportsDisputes!: boolean;

  @ApiProperty({
    enum: ["ACTIVE", "LIMITED", "PLANNED"],
  })
  rolloutStage!: string;

  @ApiProperty()
  operatingModel!: string;

  @ApiProperty()
  recommended!: boolean;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ nullable: true })
  detail!: string | null;
}

export class PaymentProviderAvailabilityResponseDto {
  @ApiProperty({ nullable: true })
  country!: string | null;

  @ApiProperty({ nullable: true })
  defaultPayoutCurrency!: string | null;

  @ApiProperty({
    enum: ["STRIPE", "PAYSTACK", "MANUAL"],
    nullable: true,
  })
  recommendedProvider!: string | null;

  @ApiProperty({
    enum: ["STRIPE", "PAYSTACK", "MANUAL"],
    nullable: true,
  })
  selectedProvider!: string | null;

  @ApiProperty({ type: PaymentProviderAvailabilityItemDto, isArray: true })
  providers!: PaymentProviderAvailabilityItemDto[];
}

export class PaymentProviderCapabilityMatrixResponseDto {
  @ApiProperty({ type: PaymentProviderAvailabilityItemDto, isArray: true })
  providers!: PaymentProviderAvailabilityItemDto[];
}

export class SelectPaymentProviderDto {
  @ApiProperty({
    enum: PaymentProvider,
  })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
