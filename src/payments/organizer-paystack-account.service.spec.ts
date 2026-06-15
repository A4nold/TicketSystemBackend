import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerPaystackAccountService } from "./organizer-paystack-account.service";

describe("OrganizerPaystackAccountService", () => {
  const prisma = {
    organizerPaymentProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    organizerProfile: {
      findUnique: vi.fn(),
    },
    paymentAccount: {
      upsert: vi.fn(),
    },
  };
  const organizerPaymentsQueryService = {
    getOrganizerPaystackReadiness: vi.fn(),
  };
  const paymentAccountRepository = {
    findPaystackAccountByOrganizerId: vi.fn(),
  };

  let service: OrganizerPaystackAccountService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENABLE_PAYSTACK_ORGANIZER_ONBOARDING = "true";
    process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack";
    service = new OrganizerPaystackAccountService(
      prisma as never,
      organizerPaymentsQueryService as never,
      paymentAccountRepository as never,
    );
  });

  it("lists paystack banks sorted by name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [
            { code: "058", name: "GTBank", slug: "gtbank" },
            { code: "044", name: "Access Bank", slug: "access-bank" },
          ],
        }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await service.listBanks({
      accountType: "ORGANIZER",
    } as never);

    expect(result).toEqual([
      { code: "044", name: "Access Bank", slug: "access-bank" },
      { code: "058", name: "GTBank", slug: "gtbank" },
    ]);
  });

  it("creates a paystack subaccount after resolving the bank account", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: {
              account_name: "Campus Night Limited",
              account_number: "0123456789",
              bank_id: 12,
            },
          }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: {
              active: true,
              business_name: "Campus Night Limited",
              id: 321,
              is_verified: true,
              settlement_schedule: "AUTO",
              subaccount_code: "ACCT_sub_123",
            },
          }),
        ok: true,
      });
    vi.stubGlobal("fetch", fetchMock);

    prisma.organizerProfile.findUnique.mockResolvedValue({
      country: "NG",
      defaultPayoutCurrency: "NGN",
    });
    prisma.organizerPaymentProfile.findUnique.mockResolvedValue({
      firstReadyAt: null,
    });
    paymentAccountRepository.findPaystackAccountByOrganizerId.mockResolvedValue(null);
    organizerPaymentsQueryService.getOrganizerPaystackReadiness.mockResolvedValue({
      organizerId: "org_123",
      subaccountCode: "ACCT_sub_123",
    });

    const result = await service.createAccount(
      {
        accountType: "ORGANIZER",
        email: "organizer@example.com",
        id: "org_123",
      } as never,
      {
        accountNumber: "0123456789",
        bankCode: "058",
        businessName: "Campus Night Limited",
      },
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.paystack.co/bank/resolve?account_number=0123456789&bank_code=058",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.paystack.co/subaccount",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(prisma.paymentAccount.upsert).toHaveBeenCalled();
    expect(prisma.organizerPaymentProfile.upsert).toHaveBeenCalled();
    expect(result).toEqual({
      organizerId: "org_123",
      subaccountCode: "ACCT_sub_123",
    });
  });

  it("refreshes an existing paystack subaccount and updates readiness", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {
            account_number: "0123456789",
            active: true,
            bank: 12,
            business_name: "Campus Night Limited",
            id: 321,
            is_verified: true,
            settlement_schedule: "AUTO",
            subaccount_code: "ACCT_sub_123",
          },
        }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    prisma.organizerProfile.findUnique.mockResolvedValue({
      country: "NG",
      defaultPayoutCurrency: "NGN",
    });
    prisma.organizerPaymentProfile.findUnique.mockResolvedValue({
      firstReadyAt: null,
    });
    paymentAccountRepository.findPaystackAccountByOrganizerId.mockResolvedValue({
      externalAccountCode: "ACCT_sub_123",
      metadata: {
        paystack: {
          accountHolderName: "Campus Night Limited",
          bankCode: "058",
          businessName: "Campus Night Limited",
        },
      },
    });
    organizerPaymentsQueryService.getOrganizerPaystackReadiness.mockResolvedValue({
      organizerId: "org_123",
      isReadyForPaidEvents: true,
      subaccountCode: "ACCT_sub_123",
    });

    const result = await service.refreshAccountStatusForOrganizer("org_123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paystack.co/subaccount/ACCT_sub_123",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(prisma.paymentAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          payoutsEnabled: true,
          verificationStatus: "VERIFIED",
        }),
      }),
    );
    expect(prisma.organizerPaymentProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          isReadyForPaidEvents: true,
        }),
      }),
    );
    expect(result).toEqual({
      organizerId: "org_123",
      isReadyForPaidEvents: true,
      subaccountCode: "ACCT_sub_123",
    });
  });
});
