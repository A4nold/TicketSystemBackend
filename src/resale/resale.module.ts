import { Module } from "@nestjs/common";

import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";
import { BuyResaleListingService } from "./buy-resale-listing.service";
import { CancelResaleListingService } from "./cancel-resale-listing.service";
import { CreateResaleListingService } from "./create-resale-listing.service";
import { PublicResaleQueryService } from "./public-resale-query.service";
import { ResaleTicketRepository } from "./repositories/resale-ticket.repository";
import { ResaleController } from "./resale.controller";
import { ResaleService } from "./resale.service";

@Module({
  controllers: [ResaleController],
  providers: [
    BuyResaleListingService,
    CancelResaleListingService,
    CreateResaleListingService,
    PublicResaleQueryService,
    ResaleTicketRepository,
    ResaleService,
    TicketOwnershipHistoryService,
  ],
  exports: [ResaleService],
})
export class ResaleModule {}
