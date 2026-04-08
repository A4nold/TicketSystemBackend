import { ApiProperty } from "@nestjs/swagger";

export class EventOrganizerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class EventTicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: "15" })
  price!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ nullable: true })
  maxPerOrder!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true, required: false })
  saleStartsAt?: Date | null;

  @ApiProperty({ nullable: true, required: false })
  saleEndsAt?: Date | null;
}

export class EventResaleWindowDto {
  @ApiProperty({ nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ example: "25", nullable: true })
  maxResalePrice!: string | null;
}

export class EventSalesWindowDto {
  @ApiProperty({ nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ nullable: true })
  endsAt!: Date | null;
}

export class EventStaffMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ nullable: true })
  invitedAt!: Date | null;

  @ApiProperty({ nullable: true })
  acceptedAt!: Date | null;

  @ApiProperty({ type: EventOrganizerDto })
  user!: EventOrganizerDto;
}

export class EventMetricsDto {
  @ApiProperty()
  tickets!: number;

  @ApiProperty()
  scanAttempts!: number;

  @ApiProperty()
  resaleListings!: number;
}

export class EventSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  venueName!: string | null;

  @ApiProperty({ nullable: true })
  venueAddress!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty({ nullable: true })
  endsAt!: Date | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty()
  allowResale!: boolean;

  @ApiProperty({ type: EventResaleWindowDto })
  resaleWindow!: EventResaleWindowDto;

  @ApiProperty({ type: EventOrganizerDto })
  organizer!: EventOrganizerDto;

  @ApiProperty({ type: [EventTicketTypeDto] })
  ticketTypes!: EventTicketTypeDto[];

  @ApiProperty()
  issuedTicketsCount!: number;
}

export class EventDetailResponseDto extends EventSummaryResponseDto {
  @ApiProperty({ type: EventSalesWindowDto })
  salesWindow!: EventSalesWindowDto;

  @ApiProperty({ type: EventResaleWindowDto })
  resalePolicy!: EventResaleWindowDto;

  @ApiProperty({ type: [EventStaffMemberDto] })
  staff!: EventStaffMemberDto[];

  @ApiProperty({ type: EventMetricsDto })
  metrics!: EventMetricsDto;
}

export class StaffMembershipResponseDto extends EventStaffMemberDto {}
