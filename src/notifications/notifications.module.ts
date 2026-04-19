import { Module } from "@nestjs/common";

import { MyNotificationsController } from "./my-notifications.controller";
import { PreEventReminderSweepService } from "./pre-event-reminder-sweep.service";
import { PostEventNotificationSchedulerService } from "./post-event-notification-scheduler.service";
import { NotificationsService } from "./notifications.service";
import { PostEventNotificationSweepService } from "./post-event-notification-sweep.service";

@Module({
  controllers: [MyNotificationsController],
  providers: [
    NotificationsService,
    PreEventReminderSweepService,
    PostEventNotificationSweepService,
    PostEventNotificationSchedulerService,
  ],
  exports: [NotificationsService, PostEventNotificationSweepService, PreEventReminderSweepService],
})
export class NotificationsModule {}
