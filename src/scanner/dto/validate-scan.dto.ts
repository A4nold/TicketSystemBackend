import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ScanMode } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class ValidateScanDto {
  @ApiProperty({
    description: "Scanned QR token identifier from the ticket payload",
    example: "qr_seed_vip_0001",
  })
  @IsOptional()
  @IsString()
  qrTokenId?: string;

  @ApiPropertyOptional({
    description: "Signed QR payload returned by the attendee ticket endpoint",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsOptional()
  @IsString()
  qrPayload?: string;

  @ApiPropertyOptional({
    description: "Ownership revision encoded in the scanned QR payload",
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  scannedRevision?: number;

  @ApiPropertyOptional({
    description: "Scanner device fingerprint or stable client identifier",
    example: "front-gate-iphone-01",
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({
    description: "Human-friendly device label shown to operations staff",
    example: "Front Gate iPhone",
  })
  @IsOptional()
  @IsString()
  deviceLabel?: string;

  @ApiPropertyOptional({
    description: "Existing scan session ID if the scanner already has one",
    example: "cmnpwblrf000x71uj0u7abcd1",
  })
  @IsOptional()
  @IsString()
  scanSessionId?: string;

  @ApiPropertyOptional({
    description: "Scanner mode used for the attempt",
    enum: ScanMode,
    example: ScanMode.ONLINE,
  })
  @IsOptional()
  @IsEnum(ScanMode)
  mode: ScanMode = ScanMode.ONLINE;

  @ApiPropertyOptional({
    description: "Client-recorded timestamp for offline or device-local capture",
    example: "2026-05-15T21:12:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  deviceRecordedAt?: string;
}
