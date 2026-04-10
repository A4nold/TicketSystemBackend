import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { ResaleService } from "../resale/resale.service";
import { TransfersService } from "../transfers/transfers.service";
import { MyTicketActionsController } from "./my-ticket-actions.controller";
import { MyTicketsController } from "./my-tickets.controller";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController, MyTicketsController, MyTicketActionsController],
  providers: [TicketsService, TransfersService, ResaleService],
})
export class TicketsModule {}
