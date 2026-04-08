import { ApiProperty } from "@nestjs/swagger";
import { StaffRole } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";

export class InviteStaffMemberDto {
  @ApiProperty({
    example: "scanner@campusnight.ie",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: [StaffRole.ADMIN, StaffRole.SCANNER],
    example: StaffRole.SCANNER,
  })
  @IsEnum(StaffRole)
  role!: StaffRole;
}
