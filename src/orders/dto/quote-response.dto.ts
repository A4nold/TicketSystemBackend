import { ApiProperty } from "@nestjs/swagger";

import { OrderEventSummaryDto, OrderFeePolicyDto, OrderItemResponseDto } from "./order-response.dto";

export class CheckoutQuoteResponseDto {
  @ApiProperty({ type: OrderEventSummaryDto })
  event!: OrderEventSummaryDto;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  subtotalAmount!: string;

  @ApiProperty()
  feeAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty({ type: OrderFeePolicyDto })
  feePolicy!: OrderFeePolicyDto;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];
}
