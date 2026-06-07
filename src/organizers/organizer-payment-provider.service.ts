import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { OrganizerProfileService } from "./organizer-profile.service";

type ProviderAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "COMING_SOON";

type ProviderAvailabilityItem = {
  detail: string | null;
  operatingModel: string;
  provider: PaymentProvider;
  recommended: boolean;
  rolloutStage: "ACTIVE" | "LIMITED" | "PLANNED";
  status: ProviderAvailabilityStatus;
  summary: string;
  supportsCustomerCheckout: boolean;
  supportsDisputes: boolean;
  supportsPlatformFeeAutomation: boolean;
  supportsOnboarding: boolean;
  supportsPayouts: boolean;
  supportsRefunds: boolean;
};

@Injectable()
export class OrganizerPaymentProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerProfileService: OrganizerProfileService,
  ) {}

  async getAvailability(user: AuthenticatedUser) {
    this.assertOrganizer(user);

    const profile = await this.organizerProfileService.getProfile(user);
    const country = profile.country?.toUpperCase() ?? null;
    const defaultPayoutCurrency = profile.defaultPayoutCurrency?.toUpperCase() ?? null;
    const paystackOrganizerEnabled =
      process.env.ENABLE_PAYSTACK_ORGANIZER_ONBOARDING === "true";

    const recommendedProvider = this.resolveRecommendedProvider({
      country,
      defaultPayoutCurrency,
      paystackOrganizerEnabled,
    });

    const providers: ProviderAvailabilityItem[] = [
      this.buildStripeAvailability({
        country,
        defaultPayoutCurrency,
        recommendedProvider,
      }),
      this.buildPaystackAvailability({
        country,
        defaultPayoutCurrency,
        paystackOrganizerEnabled,
        recommendedProvider,
      }),
    ];

    return {
      country,
      defaultPayoutCurrency,
      providers,
      recommendedProvider,
      selectedProvider: profile.selectedPaymentProvider,
    };
  }

  async getCapabilityMatrix() {
    const paystackOrganizerEnabled =
      process.env.ENABLE_PAYSTACK_ORGANIZER_ONBOARDING === "true";

    return {
      providers: [
        this.buildStripeAvailability({
          country: null,
          defaultPayoutCurrency: null,
          recommendedProvider: PaymentProvider.STRIPE,
        }),
        this.buildPaystackAvailability({
          country: null,
          defaultPayoutCurrency: null,
          paystackOrganizerEnabled,
          recommendedProvider: PaymentProvider.STRIPE,
        }),
      ],
    };
  }

  async selectProvider(user: AuthenticatedUser, provider: PaymentProvider) {
    this.assertOrganizer(user);

    const availability = await this.getAvailability(user);
    const selected = availability.providers.find((item) => item.provider === provider);

    if (!selected || selected.status !== "AVAILABLE") {
      throw new BadRequestException(
        `${provider} is not available for organizer payouts with the current country and currency setup.`,
      );
    }

    return this.prisma.organizerProfile.update({
      where: { userId: user.id },
      data: {
        providerSelectedAt: new Date(),
        providerSelectionSource: "MANUAL",
        recommendedProvider: availability.recommendedProvider,
        selectedPaymentProvider: provider,
      },
    });
  }

  private buildStripeAvailability(input: {
    country: string | null;
    defaultPayoutCurrency: string | null;
    recommendedProvider: PaymentProvider;
  }): ProviderAvailabilityItem {
    return {
      detail:
        input.country && input.defaultPayoutCurrency
          ? `Stripe supports ${input.defaultPayoutCurrency} organizer payouts for this setup path.`
          : "Stripe is the default organizer payout path until your operating country and payout currency are confirmed.",
      operatingModel: "Connect Express with destination charges and application fees.",
      provider: PaymentProvider.STRIPE,
      recommended: input.recommendedProvider === PaymentProvider.STRIPE,
      rolloutStage: "ACTIVE",
      status: "AVAILABLE",
      summary: "International and EU organizer payouts",
      supportsCustomerCheckout: true,
      supportsDisputes: true,
      supportsOnboarding: true,
      supportsPayouts: true,
      supportsPlatformFeeAutomation: true,
      supportsRefunds: true,
    };
  }

  private buildPaystackAvailability(input: {
    country: string | null;
    defaultPayoutCurrency: string | null;
    paystackOrganizerEnabled: boolean;
    recommendedProvider: PaymentProvider;
  }): ProviderAvailabilityItem {
    const isNigeria = input.country === "NG";
    const isNgn = input.defaultPayoutCurrency === "NGN";

    if (input.paystackOrganizerEnabled && isNigeria && isNgn) {
      return {
        detail: "Best fit for Nigerian NGN organizer payouts when Paystack organizer onboarding is enabled.",
        operatingModel: "Regional organizer payout path for NGN when rollout is enabled.",
        provider: PaymentProvider.PAYSTACK,
        recommended: input.recommendedProvider === PaymentProvider.PAYSTACK,
        rolloutStage: "LIMITED",
        status: "AVAILABLE",
        summary: "Domestic Nigerian payout path",
        supportsCustomerCheckout: true,
        supportsDisputes: false,
        supportsOnboarding: true,
        supportsPayouts: true,
        supportsPlatformFeeAutomation: false,
        supportsRefunds: true,
      };
    }

    if (isNigeria || isNgn) {
      return {
        detail: input.paystackOrganizerEnabled
          ? "Complete your organizer country and payout currency as NG / NGN to use Paystack here."
          : "Paystack customer checkout exists today, but organizer payout onboarding is still gated for this rollout.",
        operatingModel: input.paystackOrganizerEnabled
          ? "Regional organizer payout path for NGN when rollout is enabled."
          : "Customer checkout only today; organizer payouts are not yet active in Maya.",
        provider: PaymentProvider.PAYSTACK,
        recommended: false,
        rolloutStage: input.paystackOrganizerEnabled ? "LIMITED" : "PLANNED",
        status: input.paystackOrganizerEnabled ? "UNAVAILABLE" : "COMING_SOON",
        summary: "Nigerian payout path",
        supportsCustomerCheckout: true,
        supportsDisputes: false,
        supportsOnboarding: input.paystackOrganizerEnabled,
        supportsPayouts: input.paystackOrganizerEnabled,
        supportsPlatformFeeAutomation: false,
        supportsRefunds: true,
      };
    }

    return {
      detail: "Paystack is intended for Nigerian organizer payout scenarios and is not recommended for this profile.",
      operatingModel: input.paystackOrganizerEnabled
        ? "Regional organizer payout path for NGN when rollout is enabled."
        : "Customer checkout only today; organizer payouts are not yet active in Maya.",
      provider: PaymentProvider.PAYSTACK,
      recommended: false,
      rolloutStage: input.paystackOrganizerEnabled ? "LIMITED" : "PLANNED",
      status: input.paystackOrganizerEnabled ? "UNAVAILABLE" : "COMING_SOON",
      summary: "Nigerian payout path",
      supportsCustomerCheckout: true,
      supportsDisputes: false,
      supportsOnboarding: input.paystackOrganizerEnabled,
      supportsPayouts: input.paystackOrganizerEnabled,
      supportsPlatformFeeAutomation: false,
      supportsRefunds: true,
    };
  }

  private resolveRecommendedProvider(input: {
    country: string | null;
    defaultPayoutCurrency: string | null;
    paystackOrganizerEnabled: boolean;
  }) {
    if (
      input.paystackOrganizerEnabled &&
      input.country === "NG" &&
      input.defaultPayoutCurrency === "NGN"
    ) {
      return PaymentProvider.PAYSTACK;
    }

    return PaymentProvider.STRIPE;
  }

  private assertOrganizer(user: AuthenticatedUser) {
    if (user.accountType !== "ORGANIZER") {
      throw new ForbiddenException("Only organizer accounts can configure payout providers.");
    }
  }
}
