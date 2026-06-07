import { ApiProperty } from "@nestjs/swagger";

export class EventAttendeeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class EventAttendeeTicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class EventAttendeeSummaryDto {
  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  checkedInCount!: number;

  @ApiProperty()
  refundedCount!: number;

  @ApiProperty()
  activeCount!: number;
}

export class EventAttendeeRowDto {
  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  serialNumber!: string;

  @ApiProperty()
  ticketStatus!: string;

  @ApiProperty()
  checkedIn!: boolean;

  @ApiProperty({ nullable: true })
  checkedInAt!: Date | null;

  @ApiProperty()
  purchaseDate!: Date;

  @ApiProperty({ type: EventAttendeeTicketTypeDto })
  ticketType!: EventAttendeeTicketTypeDto;

  @ApiProperty({ type: EventAttendeeUserDto })
  holder!: EventAttendeeUserDto;

  @ApiProperty({ type: EventAttendeeUserDto })
  purchaser!: EventAttendeeUserDto;
}

export class EventAttendeesResponseDto {
  @ApiProperty({ type: EventAttendeeSummaryDto })
  summary!: EventAttendeeSummaryDto;

  @ApiProperty({ type: EventAttendeeRowDto, isArray: true })
  items!: EventAttendeeRowDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}
