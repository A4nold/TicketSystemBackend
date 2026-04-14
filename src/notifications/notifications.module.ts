import { Module } from "@nestjs/common";

import { MyNotificationsController } from "./my-notifications.controller";
import { PostEventNotificationSchedulerService } from "./post-event-notification-scheduler.service";
import { NotificationsService } from "./notifications.service";
import { PostEventNotificationSweepService } from "./post-event-notification-sweep.service";

@Module({
  controllers: [MyNotificationsController],
  providers: [
    NotificationsService,
    PostEventNotificationSweepService,
    PostEventNotificationSchedulerService,
  ],
  exports: [NotificationsService, PostEventNotificationSweepService],
})
export class NotificationsModule {}
