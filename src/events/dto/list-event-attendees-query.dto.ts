import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { TicketStatus } from "@prisma/client";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const EVENT_ATTENDEE_CHECKIN_STATUSES = ["CHECKED_IN", "NOT_CHECKED_IN"] as const;
export type EventAttendeeCheckInStatus =
  (typeof EVENT_ATTENDEE_CHECKIN_STATUSES)[number];
export const EVENT_ATTENDEE_STATES = ["ACTIVE", "REFUNDED"] as const;
export type EventAttendeeState = (typeof EVENT_ATTENDEE_STATES)[number];

export class ListEventAttendeesQueryDto {
  @ApiPropertyOptional({
    description: "Ticket id cursor for loading the next page of attendees",
    example: "cm_attendee_ticket_123",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Maximum number of attendees to return",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      "Searches attendee holder, purchaser, serial number, or ticket type name",
    example: "ada",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Optional ticket status filter",
    enum: TicketStatus,
    example: "REFUNDED",
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(TicketStatus))
  ticketStatus?: TicketStatus;

  @ApiPropertyOptional({
    description: "Optional check-in status filter",
    enum: EVENT_ATTENDEE_CHECKIN_STATUSES,
    example: "CHECKED_IN",
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_ATTENDEE_CHECKIN_STATUSES)
  checkInStatus?: EventAttendeeCheckInStatus;

  @ApiPropertyOptional({
    description: "Optional ticket type id filter",
    example: "ticket_type_123",
  })
  @IsOptional()
  @IsString()
  ticketTypeId?: string;

  @ApiPropertyOptional({
    description: "Optional organizer attendee state filter",
    enum: EVENT_ATTENDEE_STATES,
    example: "ACTIVE",
  })
  @IsOptional()
  @IsString()
  @IsIn(EVENT_ATTENDEE_STATES)
  state?: EventAttendeeState;
}
