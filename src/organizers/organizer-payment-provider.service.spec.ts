import { BadRequestException } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerPaymentProviderService } from "./organizer-payment-provider.service";

describe("OrganizerPaymentProviderService", () => {
  const prisma = {
    organizerProfile: {
      update: vi.fn(),
    },
  };

  const organizerProfileService = {
    getProfile: vi.fn(),
  };

  let service: OrganizerPaymentProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLE_PAYSTACK_ORGANIZER_ONBOARDING;
    service = new OrganizerPaymentProviderService(
      prisma as never,
      organizerProfileService as never,
    );
  });

  it("recommends Stripe by default", async () => {
    organizerProfileService.getProfile.mockResolvedValue({
      country: "IE",
      defaultPayoutCurrency: "EUR",
      selectedPaymentProvider: null,
    });

    const result = await service.getAvailability({
      accountType: "ORGANIZER",
      id: "user_1",
      profile: null,
    } as never);

    expect(result.recommendedProvider).toBe(PaymentProvider.STRIPE);
    expect(result.providers.find((item) => item.provider === PaymentProvider.STRIPE)?.recommended).toBe(
      true,
    );
  });

  it("recommends Paystack for NG / NGN when organizer onboarding is enabled", async () => {
    process.env.ENABLE_PAYSTACK_ORGANIZER_ONBOARDING = "true";
    organizerProfileService.getProfile.mockResolvedValue({
      country: "NG",
      defaultPayoutCurrency: "NGN",
      selectedPaymentProvider: null,
    });

    const result = await service.getAvailability({
      accountType: "ORGANIZER",
      id: "user_1",
      profile: null,
    } as never);

    expect(result.recommendedProvider).toBe(PaymentProvider.PAYSTACK);
    expect(result.providers.find((item) => item.provider === PaymentProvider.PAYSTACK)?.status).toBe(
      "AVAILABLE",
    );
  });

  it("rejects unavailable provider selection", async () => {
    organizerProfileService.getProfile.mockResolvedValue({
      country: "IE",
      defaultPayoutCurrency: "EUR",
      selectedPaymentProvider: null,
    });

    await expect(
      service.selectProvider(
        {
          accountType: "ORGANIZER",
          id: "user_1",
          profile: null,
        } as never,
        PaymentProvider.PAYSTACK,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
