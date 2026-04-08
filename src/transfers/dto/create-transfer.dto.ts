import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateTransferDto {
  @ApiPropertyOptional({
    description: "Recipient user ID if the recipient already has an account",
    example: "cmnpwbloh000871ujb5a0ioo1",
  })
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @ApiProperty({
    description: "Recipient email used to claim or confirm the transfer",
    example: "zara@student.ie",
  })
  @IsEmail()
  recipientEmail!: string;

  @ApiPropertyOptional({
    description: "Optional sender note attached to the transfer",
    example: "Sending you my spare ticket.",
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: "Optional explicit expiry timestamp",
    example: "2026-05-14T23:59:59.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
