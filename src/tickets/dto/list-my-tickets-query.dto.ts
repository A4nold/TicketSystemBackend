import { ApiPropertyOptional } from "@nestjs/swagger";
import { TicketStatus } from "@prisma/client";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ListMyTicketsQueryDto {
  @ApiPropertyOptional({
    description: "Optional ticket status filter",
    example: "ISSUED",
    enum: TicketStatus,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(TicketStatus))
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: "Optional event slug filter",
    example: "campus-neon-takeover",
  })
  @IsOptional()
  @IsString()
  eventSlug?: string;

  @ApiPropertyOptional({
    description: "Sort direction by event start time",
    enum: ["asc", "desc"],
    example: "asc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sort: "asc" | "desc" = "asc";
}
