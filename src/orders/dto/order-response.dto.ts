import { ApiProperty } from "@nestjs/swagger";
import { OrderStatus, PaymentProvider, TicketStatus } from "@prisma/client";

export class OrderEventSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startsAt!: Date;
}

export class OrderItemResponseDto {
  @ApiProperty()
  ticketTypeId!: string;

  @ApiProperty()
  ticketTypeName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  totalPrice!: string;

  @ApiProperty()
  currency!: string;
}

export class IssuedTicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty({ enum: TicketStatus })
  status!: TicketStatus;

  @ApiProperty()
  qrTokenId!: string;

  @ApiProperty()
  ownershipRevision!: number;

  @ApiProperty({ nullable: true })
  issuedAt!: Date | null;
}

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  subtotalAmount!: string;

  @ApiProperty()
  feeAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty({ enum: PaymentProvider })
  paymentProvider!: PaymentProvider;

  @ApiProperty({ nullable: true })
  paymentReference!: string | null;

  @ApiProperty({ nullable: true })
  checkoutSessionId!: string | null;

  @ApiProperty({ nullable: true })
  checkoutUrl!: string | null;

  @ApiProperty({ nullable: true })
  paymentStatus!: string | null;

  @ApiProperty({ nullable: true })
  idempotencyKey!: string | null;

  @ApiProperty({ nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty({ type: OrderEventSummaryDto })
  event!: OrderEventSummaryDto;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: IssuedTicketResponseDto, isArray: true })
  tickets!: IssuedTicketResponseDto[];
}
