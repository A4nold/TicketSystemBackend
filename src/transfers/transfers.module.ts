import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { AcceptTransferService } from "./accept-transfer.service";
import { CancelTransferService } from "./cancel-transfer.service";
import { CreateTransferService } from "./create-transfer.service";
import { TransferTicketRepository } from "./repositories/transfer-ticket.repository";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [NotificationsModule],
  controllers: [TransfersController],
  providers: [
    AcceptTransferService,
    CancelTransferService,
    CreateTransferService,
    TicketOwnershipHistoryService,
    TransferTicketRepository,
    TransfersService,
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
