import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { isStripeConnectEventPublishGuardEnabled } from "../common/feature-flags";
import { OrganizerPaymentsQueryService } from "../payments/organizer-payments-query.service";

type TicketPricingInput = {
  pricingMode: "FIXED" | "FREE" | "OFFER_RANGE";
  price: Prisma.Decimal;
};

@Injectable()
export class EventPaymentReadinessService {
  constructor(
    private readonly organizerPaymentsQueryService: OrganizerPaymentsQueryService,
  ) {}

  async assertOrganizerCanPublishPaidEvent(organizerId: string) {
    if (!isStripeConnectEventPublishGuardEnabled()) {
      return;
    }

    const readiness =
      await this.organizerPaymentsQueryService.getOrganizerStripeReadiness(
        organizerId,
      );

    if (readiness.isReadyForPaidEvents) {
      return;
    }

    throw new BadRequestException({
      code: "ORGANIZER_PAYMENT_ACCOUNT_NOT_READY",
      message:
        "Organizer Stripe account is not ready for paid events. Complete Stripe onboarding and ensure charges and payouts are enabled before publishing paid events.",
    });
  }

  requiresPaidEventReadiness(pricing: TicketPricingInput) {
    if (pricing.pricingMode === "FREE") {
      return false;
    }

    if (pricing.pricingMode === "OFFER_RANGE") {
      return true;
    }

    return pricing.price.greaterThan(new Prisma.Decimal(0));
  }
}
