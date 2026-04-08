import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiRootResponseDto } from "./common/dto/api-root-response.dto";

@ApiTags("root")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: "Get API root metadata",
    description: "Returns a small discovery payload for the current API surface.",
  })
  @ApiOkResponse({
    description: "API metadata response",
    type: ApiRootResponseDto,
  })
  getApiRoot(): ApiRootResponseDto {
    return {
      name: "Private Event Smart Ticketing API",
      version: "1.0.0",
      docsUrl: "/docs",
      routes: [
        "/api/health",
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/me",
        "/api/events",
        "/api/events/:slug",
        "/api/events/:eventId",
        "/api/events/:eventId/ticket-types",
        "/api/events/:eventId/ticket-types/:ticketTypeId",
        "/api/events/:eventId/staff",
        "/api/events/:eventId/staff/invite",
        "/api/events/:eventId/staff/accept",
        "/api/events/:eventId/staff/:membershipId",
        "/api/events/:eventId/staff/:membershipId/revoke",
        "/api/me/tickets",
        "/api/me/tickets/:serialNumber",
        "/api/me/tickets/:serialNumber/qr",
        "/api/me/tickets/:serialNumber/transfer",
        "/api/me/tickets/:serialNumber/cancel-transfer",
        "/api/me/tickets/:serialNumber/resale",
        "/api/me/tickets/:serialNumber/cancel-resale",
        "/api/tickets",
        "/api/tickets/:serialNumber",
        "/api/orders/me",
        "/api/orders/:orderId",
        "/api/orders/checkout",
        "/api/orders/:orderId/confirm-payment",
        "/api/orders/:orderId/cancel",
        "/api/payments/webhooks/stripe",
        "/api/tickets/:serialNumber/transfer",
        "/api/tickets/:serialNumber/accept-transfer",
        "/api/tickets/:serialNumber/cancel-transfer",
        "/api/tickets/:serialNumber/resale",
        "/api/tickets/:serialNumber/buy-resale",
        "/api/tickets/:serialNumber/cancel-resale",
        "/api/scanner/events/:eventId/manifest",
        "/api/scanner/events/:eventId/validate",
        "/api/scanner/events/:eventId/sync",
      ],
    };
  }
}
