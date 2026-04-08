import { ApiPropertyOptional } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ListEventsQueryDto {
  @ApiPropertyOptional({
    description: "Optional event status filter",
    example: "PUBLISHED",
    enum: EventStatus,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(EventStatus))
  status?: EventStatus;

  @ApiPropertyOptional({
    description: "Sort direction by event start time",
    enum: ["asc", "desc"],
    example: "asc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sort: "asc" | "desc" = "asc";
}
