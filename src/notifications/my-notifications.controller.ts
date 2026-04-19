import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { ListUserNotificationsQueryDto } from "./dto/list-user-notifications-query.dto";
import { PaginatedUserNotificationResponseDto } from "./dto/paginated-user-notification-response.dto";
import { RegisterPushDeviceDto, UnregisterPushDeviceDto } from "./dto/register-push-device.dto";
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
  @ApiQuery({
    name: "cursor",
    required: false,
    description: "Notification id cursor for loading older notifications",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of notifications to return",
    example: 10,
  })
  @ApiOkResponse({
    description: "Authenticated user's recent notifications",
    type: PaginatedUserNotificationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  async listNotifications(
    @Query() query: ListUserNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.postEventNotificationSweepService.trySweepEligibleEvents();
    return this.notificationsService.listUserNotifications(user, query);
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

  @Post("push-devices")
  @ApiOperation({
    summary: "Register a mobile push device for the authenticated user",
  })
  registerPushDevice(
    @Body() payload: RegisterPushDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.registerPushDevice(user, payload);
  }

  @Post("push-devices/unregister")
  @ApiOperation({
    summary: "Unregister a mobile push device for the authenticated user",
  })
  unregisterPushDevice(
    @Body() payload: UnregisterPushDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.unregisterPushDevice(user, payload);
  }
}
