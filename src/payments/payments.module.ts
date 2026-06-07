import { Global, Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { AdminPaymentsController } from "./admin-payments.controller";
import { AdminPaymentsGuard } from "./admin-payments.guard";
import { AdminPaymentsOperationsService } from "./admin-payments-operations.service";
import { OrganizerPaymentsController } from "./organizer-payments.controller";
import { OrganizerPaymentsQueryService } from "./organizer-payments-query.service";
import { OrganizerStripeAccountService } from "./organizer-stripe-account.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsReturnsController } from "./payments-returns.controller";
import { PaymentAccountRepository } from "./repositories/payment-account.repository";
import { DisputeRepository } from "./repositories/dispute.repository";
import { OrganizerEarningRepository } from "./repositories/organizer-earning.repository";
import { PaymentTransactionRepository } from "./repositories/payment-transaction.repository";
import { PlatformFeeRepository } from "./repositories/platform-fee.repository";
import { RefundRepository } from "./repositories/refund.repository";
import { WebhookEventRepository } from "./repositories/webhook-event.repository";
import { PaymentsService } from "./payments.service";

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [
    PaymentsController,
    PaymentsReturnsController,
    OrganizerPaymentsController,
    AdminPaymentsController,
  ],
  providers: [
    AdminPaymentsGuard,
    AdminPaymentsOperationsService,
    PaymentsService,
    OrganizerPaymentsQueryService,
    OrganizerStripeAccountService,
    PaymentAccountRepository,
    DisputeRepository,
    OrganizerEarningRepository,
    PaymentTransactionRepository,
    PlatformFeeRepository,
    RefundRepository,
    WebhookEventRepository,
  ],
  exports: [
    AdminPaymentsGuard,
    AdminPaymentsOperationsService,
    PaymentsService,
    OrganizerPaymentsQueryService,
    OrganizerStripeAccountService,
    PaymentAccountRepository,
    DisputeRepository,
    OrganizerEarningRepository,
    PaymentTransactionRepository,
    PlatformFeeRepository,
    RefundRepository,
    WebhookEventRepository,
  ],
})
export class PaymentsModule {}
