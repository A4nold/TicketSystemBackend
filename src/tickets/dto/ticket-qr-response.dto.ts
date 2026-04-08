import { ApiProperty } from "@nestjs/swagger";

export class TicketQrPayloadResponseDto {
  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  qrTokenId!: string;

  @ApiProperty()
  ownershipRevision!: number;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventSlug!: string;

  @ApiProperty()
  signedToken!: string;

  @ApiProperty()
  tokenType!: string;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  generatedAt!: Date;
}
