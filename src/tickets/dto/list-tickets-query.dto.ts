import { ApiPropertyOptional } from "@nestjs/swagger";
import { TicketStatus } from "@prisma/client";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ListTicketsQueryDto {
  @ApiPropertyOptional({
    description: "Optional ticket status filter",
    enum: TicketStatus,
    example: "ISSUED",
  })
  @IsOptional()
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
    description: "Optional current owner email filter",
    example: "ada@student.ie",
  })
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiPropertyOptional({
    description: "Sort direction by creation time",
    enum: ["asc", "desc"],
    example: "asc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sort: "asc" | "desc" = "asc";
}
