import { ApiProperty } from "@nestjs/swagger";
import { StaffRole } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateStaffRoleDto {
  @ApiProperty({
    enum: [StaffRole.ADMIN, StaffRole.SCANNER],
    example: StaffRole.ADMIN,
  })
  @IsEnum(StaffRole)
  role!: StaffRole;
}
