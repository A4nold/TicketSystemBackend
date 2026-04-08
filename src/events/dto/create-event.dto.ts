import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateEventDto {
  @ApiProperty({
    example: "Campus Neon Takeover",
  })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({
    example: "campus-neon-takeover",
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({
    example: "Private student event with fraud-resistant smart ticketing.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: "The Dock Warehouse",
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  venueName?: string;

  @ApiPropertyOptional({
    example: "12 River Lane, Dublin",
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  venueAddress?: string;

  @ApiProperty({
    example: "Europe/Dublin",
  })
  @IsString()
  @MaxLength(80)
  timezone!: string;

  @ApiProperty({
    example: "2026-05-15T21:00:00.000Z",
  })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({
    example: "2026-05-16T02:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    enum: EventStatus,
    example: EventStatus.DRAFT,
    default: EventStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    example: "https://example.com/event-cover.jpg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({
    example: "2026-04-01T10:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  salesStartAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-15T18:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowResale?: boolean;

  @ApiPropertyOptional({
    example: "25.00",
  })
  @IsOptional()
  @IsString()
  maxResalePrice?: string;

  @ApiPropertyOptional({
    example: "2026-04-20T10:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  resaleStartsAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-15T16:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  resaleEndsAt?: string;
}
