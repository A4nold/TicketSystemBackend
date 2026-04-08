import { ApiProperty } from "@nestjs/swagger";

export class AuthUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  tokenType!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
