import { ApiProperty } from "@nestjs/swagger";

export class ScannerManifestTicketDto {
  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  qrTokenId!: string;

  @ApiProperty()
  ownershipRevision!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  ownerEmail!: string;
}

export class ScannerManifestResponseDto {
  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventSlug!: string;

  @ApiProperty()
  eventTitle!: string;

  @ApiProperty()
  manifestVersion!: number;

  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ type: [ScannerManifestTicketDto] })
  tickets!: ScannerManifestTicketDto[];
}

export class ScanValidationResponseDto {
  @ApiProperty({ example: "VALID" })
  outcome!: string;

  @ApiProperty({ example: "first_entry" })
  reasonCode!: string;

  @ApiProperty({ nullable: true })
  ticketId!: string | null;

  @ApiProperty({ nullable: true })
  serialNumber!: string | null;

  @ApiProperty({ nullable: true })
  currentStatus!: string | null;

  @ApiProperty({ nullable: true })
  scanSessionId!: string | null;

  @ApiProperty()
  scannedAt!: Date;
}

export class ScannerSyncResponseDto {
  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  scanSessionId!: string;

  @ApiProperty()
  acceptedCount!: number;
}
