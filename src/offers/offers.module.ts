import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { TicketOfferExpiryService } from "./ticket-offer-expiry.service";
import { TicketOfferSchedulerService } from "./ticket-offer-scheduler.service";

@Module({
  imports: [NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService, TicketOfferExpiryService, TicketOfferSchedulerService],
  exports: [OffersService, TicketOfferExpiryService],
})
export class OffersModule {}

