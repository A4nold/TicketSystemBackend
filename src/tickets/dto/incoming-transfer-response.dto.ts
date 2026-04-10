import { ApiProperty } from "@nestjs/swagger";

export class IncomingTransferEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startsAt!: Date;
}

export class IncomingTransferTicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class IncomingTransferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty()
  senderEmail!: string;

  @ApiProperty({ nullable: true })
  message!: string | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ type: IncomingTransferEventDto })
  event!: IncomingTransferEventDto;

  @ApiProperty({ type: IncomingTransferTicketTypeDto })
  ticketType!: IncomingTransferTicketTypeDto;
}
