import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentProvider } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CheckoutLineItemDto {
  @ApiProperty({
    example: "cmnq167tt000b80ujfdv3bhje",
    description: "Ticket type identifier",
  })
  @IsString()
  ticketTypeId!: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateCheckoutDto {
  @ApiProperty({
    example: "campus-neon-takeover",
    description: "Event slug for the checkout",
  })
  @IsString()
  @MaxLength(120)
  eventSlug!: string;

  @ApiProperty({
    type: CheckoutLineItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineItemDto)
  items!: CheckoutLineItemDto[];

  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.STRIPE,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({
    example: "checkout-campus-neon-001",
    description: "Optional idempotency key for retry-safe checkout creation",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: "exp://127.0.0.1:8081/--/checkout/success",
    description: "Optional mobile success return URL. When provided with a cancel URL, Stripe returns into the app instead of the web frontend.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  successReturnUrl?: string;

  @ApiPropertyOptional({
    example: "exp://127.0.0.1:8081/--/checkout/cancel",
    description: "Optional mobile cancel return URL. When provided with a success URL, Stripe returns into the app instead of the web frontend.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReturnUrl?: string;
}
