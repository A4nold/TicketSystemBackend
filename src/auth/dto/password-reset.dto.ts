import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "ada@student.ie" })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "reset_token_from_email" })
  @IsString()
  @MaxLength(255)
  token!: string;

  @ApiProperty({ example: "Passw0rd!" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "password must include at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;
}

export class PasswordResetResponseDto {
  @ApiProperty({ example: "If an account exists for that email, a password reset link has been sent." })
  message!: string;
}
