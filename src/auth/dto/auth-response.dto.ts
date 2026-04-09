import { ApiProperty } from "@nestjs/swagger";

export class AuthMembershipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({
    enum: ["OWNER", "ADMIN", "SCANNER"],
  })
  role!: string;

  @ApiProperty({ nullable: true })
  acceptedAt!: string | null;
}

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

  @ApiProperty({
    enum: ["ATTENDEE", "ORGANIZER"],
  })
  accountType!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    enum: ["EVENT_OWNER"],
  })
  platformRoles!: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    enum: ["attendee", "organizer", "scanner"],
  })
  appRoles!: string[];

  @ApiProperty({
    type: AuthMembershipResponseDto,
    isArray: true,
  })
  memberships!: AuthMembershipResponseDto[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  tokenType!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
