import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { EventsController } from "./events.controller";
import { EventLifecycleService } from "./event-lifecycle.service";
import { EventQueryService } from "./event-query.service";
import { EventsService } from "./events.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EventsController],
  providers: [EventLifecycleService, EventQueryService, EventsService],
})
export class EventsModule {}
