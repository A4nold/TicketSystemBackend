import { ApiProperty } from "@nestjs/swagger";
import { NotificationStatus, NotificationType } from "@prisma/client";

export class UserNotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ nullable: true })
  actionUrl!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
