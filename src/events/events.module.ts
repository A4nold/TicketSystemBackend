import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { EventPaymentReadinessService } from "./event-payment-readiness.service";
import { EventsController } from "./events.controller";
import { EventLifecycleService } from "./event-lifecycle.service";
import { EventFlyerService } from "./event-flyer.service";
import { EventMediaService } from "./event-media.service";
import { EventQueryService } from "./event-query.service";
import { EventShareAnalyticsService } from "./event-share-analytics.service";
import { EventsService } from "./events.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EventsController],
  providers: [
    EventLifecycleService,
    EventFlyerService,
    EventMediaService,
    EventPaymentReadinessService,
    EventQueryService,
    EventShareAnalyticsService,
    EventsService,
  ],
})
export class EventsModule {}
