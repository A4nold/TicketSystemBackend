import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Request } from "express";

import { PaymentsService } from "./payments.service";

@ApiExcludeController()
@Controller("payments/webhooks")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("stripe")
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException("Missing Stripe signature header.");
    }

    const rawBody = request.rawBody;

    if (!rawBody) {
      throw new BadRequestException("Stripe webhook raw body is missing.");
    }

    return this.paymentsService.handleStripeWebhook(rawBody, signature);
  }
}
