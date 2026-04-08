import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "ada@student.ie" })
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
}
