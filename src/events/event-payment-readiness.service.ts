import { BadRequestException, Injectable } from "@nestjs/common";
import { PaymentProvider, Prisma } from "@prisma/client";

import { isStripeConnectEventPublishGuardEnabled } from "../common/feature-flags";
import { OrganizerPaymentsQueryService } from "../payments/organizer-payments-query.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventPaymentReadinessSummary } from "./mappers/event-response.mapper";

type TicketPricingInput = {
  pricingMode: "FIXED" | "FREE" | "OFFER_RANGE";
  price: Prisma.Decimal;
};

@Injectable()
export class EventPaymentReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerPaymentsQueryService: OrganizerPaymentsQueryService,
  ) {}

  async assertOrganizerCanPublishPaidEvent(organizerId: string) {
    if (!isStripeConnectEventPublishGuardEnabled()) {
      return;
    }

    const summary = await this.getEventPaymentReadinessSummary({
      organizerId,
      ticketTypes: [
        {
          price: new Prisma.Decimal("1"),
          pricingMode: "FIXED",
        },
      ],
    });

    if (summary.canPublishPaidEvent) {
      return;
    }

    throw new BadRequestException({
      code: summary.blockingCode ?? "ORGANIZER_PAYMENT_ACCOUNT_NOT_READY",
      message:
        summary.blockingMessage ??
        "Organizer payout setup is not ready for paid events. Complete organizer payout setup before publishing paid events.",
    });
  }

  async getEventPaymentReadinessSummary(input: {
    organizerId: string;
    ticketTypes: TicketPricingInput[];
  }): Promise<EventPaymentReadinessSummary> {
    const paidTicketTypes = input.ticketTypes.filter((ticketType) =>
      this.requiresPaidEventReadiness(ticketType),
    );
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { userId: input.organizerId },
      select: {
        onboardingStatus: true,
        selectedPaymentProvider: true,
      },
    });

    const selectedProvider = organizerProfile?.selectedPaymentProvider ?? null;
    const hasPaidTicketTypes = paidTicketTypes.length > 0;

    if (!hasPaidTicketTypes) {
      return {
        blockingCode: null,
        blockingMessage: null,
        canPublishPaidEvent: true,
        hasPaidTicketTypes: false,
        isReadyForPaidEvents: false,
        organizerOnboardingStatus: organizerProfile?.onboardingStatus ?? null,
        paidTicketTypeCount: 0,
        selectedProvider,
      };
    }

    if (selectedProvider === PaymentProvider.PAYSTACK) {
      const readiness =
        await this.organizerPaymentsQueryService.getOrganizerPaystackReadiness(
          input.organizerId,
        );
      const blocking =
        readiness.isReadyForPaidEvents
          ? null
          : {
              code: "ORGANIZER_PAYMENT_ACCOUNT_NOT_READY",
              message:
                "Organizer Paystack payout account is not ready for paid events. Complete Paystack payout setup and ensure the payout account is active and verified before publishing paid events.",
            };

      return {
        blockingCode: blocking?.code ?? null,
        blockingMessage: blocking?.message ?? null,
        canPublishPaidEvent: readiness.isReadyForPaidEvents,
        hasPaidTicketTypes: true,
        isReadyForPaidEvents: readiness.isReadyForPaidEvents,
        organizerOnboardingStatus: organizerProfile?.onboardingStatus ?? null,
        paidTicketTypeCount: paidTicketTypes.length,
        selectedProvider,
      };
    }

    if (selectedProvider === PaymentProvider.STRIPE) {
      const readiness =
        await this.organizerPaymentsQueryService.getOrganizerStripeReadiness(
          input.organizerId,
        );
      const blocking =
        readiness.isReadyForPaidEvents
          ? null
          : {
              code: "ORGANIZER_PAYMENT_ACCOUNT_NOT_READY",
              message:
                "Organizer Stripe account is not ready for paid events. Complete Stripe onboarding and ensure charges and payouts are enabled before publishing paid events.",
            };

      return {
        blockingCode: blocking?.code ?? null,
        blockingMessage: blocking?.message ?? null,
        canPublishPaidEvent: readiness.isReadyForPaidEvents,
        hasPaidTicketTypes: true,
        isReadyForPaidEvents: readiness.isReadyForPaidEvents,
        organizerOnboardingStatus: organizerProfile?.onboardingStatus ?? null,
        paidTicketTypeCount: paidTicketTypes.length,
        selectedProvider,
      };
    }

    return {
      blockingCode: "ORGANIZER_PAYMENT_ACCOUNT_NOT_READY",
      blockingMessage:
        "Organizer payout setup is not ready for paid events. Complete organizer payout setup before publishing paid events.",
      canPublishPaidEvent: false,
      hasPaidTicketTypes: true,
      isReadyForPaidEvents: false,
      organizerOnboardingStatus: organizerProfile?.onboardingStatus ?? null,
      paidTicketTypeCount: paidTicketTypes.length,
      selectedProvider,
    };
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
