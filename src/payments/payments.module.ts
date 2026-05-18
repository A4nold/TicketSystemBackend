import { Global, Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsReturnsController } from "./payments-returns.controller";
import { PaymentsService } from "./payments.service";

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController, PaymentsReturnsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
