import { ApiProperty } from "@nestjs/swagger";

export class TicketOwnerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class TicketEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty({
    nullable: true,
    type: "object",
    additionalProperties: false,
    properties: {
      minResalePrice: { type: "string", nullable: true, example: "15.00" },
      maxResalePrice: { type: "string", nullable: true, example: "40.00" },
      resaleRoyaltyPercent: { type: "string", nullable: true, example: "10.00" },
      startsAt: { type: "string", format: "date-time", nullable: true },
      endsAt: { type: "string", format: "date-time", nullable: true },
    },
  })
  resalePolicy!: {
    endsAt: Date | null;
    maxResalePrice: string | null;
    minResalePrice: string | null;
    resaleRoyaltyPercent: string | null;
    startsAt: Date | null;
  } | null;

  @ApiProperty({
    nullable: true,
    type: "object",
    additionalProperties: false,
    properties: {
      message: { type: "string", nullable: true },
      ctaLabel: { type: "string", nullable: true },
      ctaUrl: { type: "string", nullable: true },
      publishedAt: { type: "string", format: "date-time", nullable: true },
    },
  })
  postEventContent!: {
    ctaLabel: string | null;
    ctaUrl: string | null;
    message: string | null;
    publishedAt: Date | null;
  } | null;
}

export class TicketTypeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: "15" })
  price!: string;

  @ApiProperty()
  currency!: string;
}

export class TicketTransferSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty({ nullable: true })
  recipientEmail!: string | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ nullable: true })
  acceptedAt!: Date | null;
}

export class TicketResaleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ example: "18" })
  askingPrice!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ example: "1.80", nullable: true })
  organizerRoyaltyAmount!: string | null;

  @ApiProperty({ example: "16.20", nullable: true })
  sellerNetAmount!: string | null;

  @ApiProperty({ nullable: true })
  listedAt!: Date | null;

  @ApiProperty({ nullable: true })
  soldAt!: Date | null;
}

export class TicketScanSummaryDto {
  @ApiProperty()
  totalAttempts!: number;

  @ApiProperty()
  latestOutcome!: string | null;

  @ApiProperty({ nullable: true })
  lastScannedAt!: Date | null;
}

export class TicketOwnershipHistoryDto {
  @ApiProperty()
  changeType!: string;

  @ApiProperty()
  revision!: number;

  @ApiProperty({ nullable: true })
  fromEmail!: string | null;

  @ApiProperty({ nullable: true })
  toEmail!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class TicketIncidentTransferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty({ nullable: true })
  recipientEmail!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  acceptedAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;
}

export class TicketIncidentResaleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ example: "18.00" })
  askingPrice!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ example: "1.80", nullable: true })
  organizerRoyaltyAmount!: string | null;

  @ApiProperty({ example: "16.20", nullable: true })
  sellerNetAmount!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  listedAt!: Date | null;

  @ApiProperty({ nullable: true })
  soldAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;
}

export class TicketIncidentScanAttemptDto {
  @ApiProperty()
  outcome!: string;

  @ApiProperty({ nullable: true })
  reasonCode!: string | null;

  @ApiProperty()
  scannedAt!: Date;

  @ApiProperty({ nullable: true })
  deviceLabel!: string | null;

  @ApiProperty({ nullable: true })
  mode!: string | null;

  @ApiProperty({ nullable: true })
  scannedByEmail!: string | null;
}

export class TicketSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  qrTokenId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  ownershipRevision!: number;

  @ApiProperty({ nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ nullable: true })
  usedAt!: Date | null;

  @ApiProperty({ type: TicketEventDto })
  event!: TicketEventDto;

  @ApiProperty({ type: TicketTypeSummaryDto })
  ticketType!: TicketTypeSummaryDto;

  @ApiProperty({ type: TicketOwnerDto })
  currentOwner!: TicketOwnerDto;

  @ApiProperty({ type: TicketScanSummaryDto })
  scanSummary!: TicketScanSummaryDto;
}

export class TicketDetailResponseDto extends TicketSummaryResponseDto {
  @ApiProperty({ nullable: true })
  reservedUntil!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty({ nullable: true })
  refundedAt!: Date | null;

  @ApiProperty({ type: TicketTransferSummaryDto, nullable: true })
  latestTransfer!: TicketTransferSummaryDto | null;

  @ApiProperty({ type: TicketResaleSummaryDto, nullable: true })
  latestResaleListing!: TicketResaleSummaryDto | null;

  @ApiProperty({ type: [TicketOwnershipHistoryDto] })
  ownershipHistory!: TicketOwnershipHistoryDto[];

  @ApiProperty({ type: [TicketIncidentTransferDto] })
  transferHistory!: TicketIncidentTransferDto[];

  @ApiProperty({ type: [TicketIncidentResaleDto] })
  resaleHistory!: TicketIncidentResaleDto[];

  @ApiProperty({ type: [TicketIncidentScanAttemptDto] })
  scanAttempts!: TicketIncidentScanAttemptDto[];
}
