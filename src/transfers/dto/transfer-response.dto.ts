import { ApiProperty } from "@nestjs/swagger";

export class TransferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  transferToken!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty({ nullable: true })
  recipientUserId!: string | null;

  @ApiProperty({ nullable: true })
  recipientEmail!: string | null;

  @ApiProperty({ nullable: true })
  message!: string | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ nullable: true })
  reminderSentAt!: Date | null;

  @ApiProperty({ nullable: true })
  acceptedAt!: Date | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  ticketStatus!: string;

  @ApiProperty()
  ownershipRevision!: number;
}
