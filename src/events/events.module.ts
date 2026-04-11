import { Module } from "@nestjs/common";

import { EventsController } from "./events.controller";
import { EventLifecycleService } from "./event-lifecycle.service";
import { EventQueryService } from "./event-query.service";
import { EventsService } from "./events.service";

@Module({
  controllers: [EventsController],
  providers: [EventLifecycleService, EventQueryService, EventsService],
})
export class EventsModule {}
