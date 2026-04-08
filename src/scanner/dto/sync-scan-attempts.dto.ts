import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ScanMode, ScanOutcome } from "@prisma/client";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class OfflineScanAttemptDto {
  @ApiProperty({ example: "qr_seed_invalid_404" })
  @IsString()
  qrTokenId!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  scannedRevision?: number;

  @ApiProperty({ enum: ScanOutcome, example: ScanOutcome.INVALID })
  @IsEnum(ScanOutcome)
  outcome!: ScanOutcome;

  @ApiPropertyOptional({ example: "unknown_qr" })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiProperty({ example: "2026-05-15T21:15:00.000Z" })
  @IsDateString()
  scannedAt!: string;

  @ApiPropertyOptional({ example: "2026-05-15T21:15:05.000Z" })
  @IsOptional()
  @IsDateString()
  deviceRecordedAt?: string;
}

export class SyncScanAttemptsDto {
  @ApiPropertyOptional({
    enum: ScanMode,
    example: ScanMode.OFFLINE_SYNC,
  })
  @IsOptional()
  @IsEnum(ScanMode)
  mode: ScanMode = ScanMode.OFFLINE_SYNC;

  @ApiPropertyOptional({ example: "front-gate-iphone-01" })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({ example: "Front Gate iPhone" })
  @IsOptional()
  @IsString()
  deviceLabel?: string;

  @ApiPropertyOptional({ example: "cmnpwblrf000x71uj0u7abcd1" })
  @IsOptional()
  @IsString()
  scanSessionId?: string;

  @ApiProperty({ type: [OfflineScanAttemptDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanAttemptDto)
  attempts!: OfflineScanAttemptDto[];
}
