import { ApiProperty } from "@nestjs/swagger";

export class PublicResaleListingEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startsAt!: Date;
}

export class PublicResaleListingTicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class PublicResaleListingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ example: "18.00" })
  askingPrice!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  listedAt!: Date | null;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ type: PublicResaleListingEventDto })
  event!: PublicResaleListingEventDto;

  @ApiProperty({ type: PublicResaleListingTicketTypeDto })
  ticketType!: PublicResaleListingTicketTypeDto;
}
