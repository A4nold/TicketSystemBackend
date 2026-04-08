import { ApiProperty } from "@nestjs/swagger";

export class ResaleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  sellerUserId!: string;

  @ApiProperty({ nullable: true })
  buyerUserId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ example: "18.00" })
  askingPrice!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  saleReference!: string | null;

  @ApiProperty({ nullable: true })
  listedAt!: Date | null;

  @ApiProperty({ nullable: true })
  soldAt!: Date | null;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  ticketStatus!: string;

  @ApiProperty()
  ownershipRevision!: number;
}
