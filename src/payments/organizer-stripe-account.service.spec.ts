import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerStripeAccountService } from "./organizer-stripe-account.service";

describe("OrganizerStripeAccountService", () => {
  const prisma = {
    organizerPaymentProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    paymentAccount: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
  const organizerPaymentsQueryService = {
    getOrganizerStripeReadiness: vi.fn(),
  };
  const paymentAccountRepository = {
    findByProviderAndExternalAccountId: vi.fn(),
    findStripeAccountByOrganizerId: vi.fn(),
  };
  const notificationsService = {
    notifyOrganizerPayoutReady: vi.fn(),
  };

  let service: OrganizerStripeAccountService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_stripe";
    service = new OrganizerStripeAccountService(
      prisma as never,
      organizerPaymentsQueryService as never,
      paymentAccountRepository as never,
      notificationsService as never,
    );
  });

  it("notifies when a Stripe account becomes payout ready for the first time", async () => {
    paymentAccountRepository.findByProviderAndExternalAccountId.mockResolvedValue({
      organizerId: "org_123",
    });
    prisma.organizerPaymentProfile.findUnique.mockResolvedValue({
      firstReadyAt: null,
      isReadyForPaidEvents: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      email: "organizer@example.com",
    });

    await service.syncFromStripeWebhook({
      id: "acct_123",
      type: "express",
      country: "IE",
      default_currency: "eur",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: {
        currently_due: [],
        eventually_due: [],
        past_due: [],
        disabled_reason: null,
      },
    });

    expect(prisma.paymentAccount.upsert).toHaveBeenCalled();
    expect(prisma.organizerPaymentProfile.upsert).toHaveBeenCalled();
    expect(notificationsService.notifyOrganizerPayoutReady).toHaveBeenCalledWith({
      organizerEmail: "organizer@example.com",
      provider: "STRIPE",
      userId: "org_123",
    });
  });
});
