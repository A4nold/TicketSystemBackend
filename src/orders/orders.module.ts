import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { CheckoutService } from "./checkout.service";
import { OrderPaymentService } from "./order-payment.service";
import { OrdersController } from "./orders.controller";
import { OrderQueryService } from "./order-query.service";
import { OrdersService } from "./orders.service";
import { PurchasedTicketIssuanceService } from "./purchased-ticket-issuance.service";
import { TicketOwnershipHistoryService } from "../tickets/ticket-ownership-history.service";

@Module({
  imports: [NotificationsModule],
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
