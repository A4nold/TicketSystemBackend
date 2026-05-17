import { ApiProperty } from "@nestjs/swagger";

class TicketOfferAttendeeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

class TicketOfferTicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TicketOfferRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  ticketTypeId!: string;

  @ApiProperty()
  attendeeUserId!: string;

  @ApiProperty({ example: "35.00" })
  offeredPrice!: string;

  @ApiProperty({ example: "EUR" })
  currency!: string;

  @ApiProperty({ enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"] })
  status!: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

  @ApiProperty({ nullable: true })
  organizerNote!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: TicketOfferTicketTypeDto })
  ticketType!: TicketOfferTicketTypeDto;

  @ApiProperty({ type: TicketOfferAttendeeDto })
  attendeeUser!: TicketOfferAttendeeDto;
}
