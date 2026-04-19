import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";

import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { RequestLoggingMiddleware } from "./common/middleware/request-logging.middleware";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QrTokensModule } from "./qr/qr-tokens.module";
import { ResaleModule } from "./resale/resale.module";
import { ScannerModule } from "./scanner/scanner.module";
import { TicketsModule } from "./tickets/tickets.module";
import { TransfersModule } from "./transfers/transfers.module";

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    PrismaModule,
    NotificationsModule,
    MonitoringModule,
    QrTokensModule,
    PaymentsModule,
    HealthModule,
    EventsModule,
    TicketsModule,
    OrdersModule,
    ResaleModule,
    ScannerModule,
    TransfersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes({
      path: "*path",
      method: RequestMethod.ALL,
    });
  }
}
