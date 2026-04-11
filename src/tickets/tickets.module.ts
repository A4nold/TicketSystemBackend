import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { ResaleModule } from "../resale/resale.module";
import { TransfersModule } from "../transfers/transfers.module";
import { MyTicketActionsController } from "./my-ticket-actions.controller";
import { MyTicketsController } from "./my-tickets.controller";
import { MyTransferInboxController } from "./my-transfer-inbox.controller";
import { TicketQueryService } from "./ticket-query.service";
import { TicketOwnershipHistoryService } from "./ticket-ownership-history.service";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [NotificationsModule, TransfersModule, ResaleModule],
  controllers: [
    TicketsController,
    MyTicketsController,
    MyTransferInboxController,
    MyTicketActionsController,
  ],
  providers: [
    TicketOwnershipHistoryService,
    TicketQueryService,
    TicketsService,
  ],
})
export class TicketsModule {}
