import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { OrderQueryService } from "./order-query.service";
import { OrdersService } from "./orders.service";
import { CheckoutQuoteResponseDto } from "./dto/quote-response.dto";

@ApiTags("orders")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly orderQueryService: OrderQueryService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get("me")
  @ApiOperation({
    summary: "List the authenticated user's orders",
    description:
      "Returns the current user's orders with event, line-item, and issued ticket context.",
  })
  @ApiOkResponse({
    description: "Authenticated user's orders",
    type: OrderResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  listMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.orderQueryService.listMyOrders(user);
  }

  @Get(":orderId")
  @ApiOperation({
    summary: "Get an order by id",
    description:
      "Returns a single order when it belongs to the authenticated user.",
  })
  @ApiParam({
    name: "orderId",
    description: "Order identifier",
  })
  @ApiOkResponse({
    description: "Order response",
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Order was not found",
  })
  getOrder(
    @Param("orderId") orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderQueryService.getOrder(orderId, user);
  }

  @Post("checkout")
  @ApiOperation({
    summary: "Create a checkout order",
    description:
      "Creates a pending order after validating event sales windows, ticket-type availability, and quantity limits.",
  })
  @ApiCreatedResponse({
    description: "Pending checkout order created",
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Checkout creation failed because the event, ticket type, or requested quantities were invalid",
  })
  createCheckout(
    @Body() payload: CreateCheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.createCheckout(payload, user);
  }

  @Post("quote")
  @ApiOperation({
    summary: "Quote a checkout order",
    description:
      "Validates event sales windows, ticket-type availability, quantity limits, and returns the exact backend-calculated pricing without creating an order.",
  })
  @ApiCreatedResponse({
    description: "Checkout quote calculated",
    type: CheckoutQuoteResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Quote calculation failed because the event, ticket type, or requested quantities were invalid",
  })
  quoteCheckout(
    @Body() payload: CreateCheckoutDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.ordersService.quoteCheckout(payload);
  }

  @Post(":orderId/confirm-payment")
  @ApiOperation({
    summary: "Confirm payment for a pending order",
    description:
      "Marks a pending order as paid and issues concrete tickets for each purchased quantity.",
  })
  @ApiParam({
    name: "orderId",
    description: "Order identifier",
  })
  @ApiCreatedResponse({
    description: "Order marked paid and tickets issued",
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Payment confirmation failed because the order was not payable or inventory was no longer available",
  })
  confirmPayment(
    @Param("orderId") orderId: string,
    @Body() payload: ConfirmPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.confirmPayment(orderId, payload, user);
  }

  @Post(":orderId/cancel")
  @ApiOperation({
    summary: "Cancel a pending order",
    description:
      "Cancels a pending order so its reserved inventory is released back to sale.",
  })
  @ApiParam({
    name: "orderId",
    description: "Order identifier",
  })
  @ApiCreatedResponse({
    description: "Order cancelled",
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: "The order could not be cancelled",
  })
  cancelOrder(
    @Param("orderId") orderId: string,
    @Body() payload: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrder(orderId, payload, user);
  }
}
