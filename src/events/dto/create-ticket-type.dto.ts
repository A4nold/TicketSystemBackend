import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTicketTypeDto {
  @ApiProperty({
    example: "General Admission",
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: "Standard event access",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: "15.00",
  })
  @IsString()
  price!: string;

  @ApiPropertyOptional({
    example: "EUR",
    default: "EUR",
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiProperty({
    example: 400,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPerOrder?: number;

  @ApiPropertyOptional({
    example: "2026-04-01T10:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  saleStartsAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-15T18:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  saleEndsAt?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
