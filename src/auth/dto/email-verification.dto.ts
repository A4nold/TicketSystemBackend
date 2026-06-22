import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class VerifyEmailConfirmDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class EmailVerificationResponseDto {
  @ApiProperty()
  message!: string;
}
