import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PostEventNotificationSweepService } from "./post-event-notification-sweep.service";
import { NotificationsService } from "./notifications.service";
import { UserNotificationResponseDto } from "./dto/user-notification-response.dto";

@ApiTags("notifications")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("me/notifications")
export class MyNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly postEventNotificationSweepService: PostEventNotificationSweepService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List recent in-app notifications for the authenticated user",
  })
  @ApiOkResponse({
    description: "Authenticated user's recent notifications",
    type: UserNotificationResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  async listNotifications(@CurrentUser() user: AuthenticatedUser) {
    await this.postEventNotificationSweepService.trySweepEligibleEvents();
    return this.notificationsService.listUserNotifications(user);
  }

  @Post(":notificationId/read")
  @ApiOperation({
    summary: "Mark an in-app notification as read",
  })
  @ApiParam({
    name: "notificationId",
    example: "cm_notification_123",
  })
  @ApiOkResponse({
    description: "Updated notification",
    type: UserNotificationResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Notification was not found for the authenticated user",
  })
  markAsRead(
    @Param("notificationId") notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markNotificationAsRead(notificationId, user);
  }
}
