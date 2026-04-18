import { ApiProperty } from "@nestjs/swagger";

import { UserNotificationResponseDto } from "./user-notification-response.dto";

export class PaginatedUserNotificationResponseDto {
  @ApiProperty({
    type: UserNotificationResponseDto,
    isArray: true,
  })
  items!: UserNotificationResponseDto[];

  @ApiProperty({
    nullable: true,
    example: "cm_notification_123",
  })
  nextCursor!: string | null;
}
