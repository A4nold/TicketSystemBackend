import { Module } from "@nestjs/common";

import { CheckoutService } from "./checkout.service";
import { OrderPaymentService } from "./order-payment.service";
import { OrdersController } from "./orders.controller";
import { OrderQueryService } from "./order-query.service";
import { OrdersService } from "./orders.service";
import { PurchasedTicketIssuanceService } from "./purchased-ticket-issuance.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";

@Module({
  controllers: [OrdersController],
  providers: [
    CheckoutService,
    OrderPaymentService,
    OrderQueryService,
    OrdersService,
    PurchasedTicketIssuanceService,
    TicketOwnershipHistoryService,
  ],
})
export class OrdersModule {}
