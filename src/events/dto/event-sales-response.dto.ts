import { ApiProperty } from "@nestjs/swagger";

export class EventSalesSummaryDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  ticketsSold!: number;

  @ApiProperty()
  grossRevenue!: string;

  @ApiProperty()
  platformFees!: string;

  @ApiProperty()
  estimatedOrganizerEarnings!: string;

  @ApiProperty()
  refundedAmount!: string;
}

export class EventSalesTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  orderId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  grossAmount!: string;

  @ApiProperty()
  platformFeeAmount!: string;

  @ApiProperty()
  organizerNetAmount!: string;

  @ApiProperty()
  ticketCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class EventSalesTicketTypeBreakdownDto {
  @ApiProperty()
  ticketTypeId!: string;

  @ApiProperty()
  ticketTypeName!: string;

  @ApiProperty()
  quantitySold!: number;

  @ApiProperty()
  grossRevenue!: string;

  @ApiProperty()
  currency!: string;
}

export class EventSalesResponseDto {
  @ApiProperty({ type: EventSalesSummaryDto })
  summary!: EventSalesSummaryDto;

  @ApiProperty({ type: EventSalesTicketTypeBreakdownDto, isArray: true })
  ticketTypeBreakdown!: EventSalesTicketTypeBreakdownDto[];

  @ApiProperty({ type: EventSalesTransactionDto, isArray: true })
  recentTransactions!: EventSalesTransactionDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}
