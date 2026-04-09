import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "newuser@student.ie" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: "Passw0rd!" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "password must include at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;

  @ApiPropertyOptional({ example: "Jane" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: "+353870000010" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: ["ATTENDEE", "ORGANIZER"],
    default: "ATTENDEE",
    description: "Account onboarding path. ORGANIZER unlocks organizer event creation capability.",
  })
  @IsOptional()
  @IsIn(["ATTENDEE", "ORGANIZER"])
  accountType?: "ATTENDEE" | "ORGANIZER";
}
