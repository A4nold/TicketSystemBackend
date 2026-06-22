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
    user: {
      findUnique: vi.fn(),
    },
  };
  const organizerPaymentsQueryService = {
    getOrganizerPaystackReadiness: vi.fn(),
  };
  const paymentAccountRepository = {
    findPaystackAccountByOrganizerId: vi.fn(),
  };
  const notificationsService = {
    notifyOrganizerPayoutReady: vi.fn(),
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
      notificationsService as never,
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
      isReadyForPaidEvents: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      email: "organizer@example.com",
    });
    paymentAccountRepository.findPaystackAccountByOrganizerId.mockResolvedValue(null);
    organizerPaymentsQueryService.getOrganizerPaystackReadiness.mockResolvedValue({
      organizerId: "org_123",
      payoutAccountCode: "ACCT_sub_123",
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
    expect(notificationsService.notifyOrganizerPayoutReady).toHaveBeenCalledWith({
      organizerEmail: "organizer@example.com",
      provider: "PAYSTACK",
      userId: "org_123",
    });
    expect(result).toEqual({
      organizerId: "org_123",
      payoutAccountCode: "ACCT_sub_123",
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
      isReadyForPaidEvents: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      email: "organizer@example.com",
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
      payoutAccountCode: "ACCT_sub_123",
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
      payoutAccountCode: "ACCT_sub_123",
    });
    expect(notificationsService.notifyOrganizerPayoutReady).toHaveBeenCalledWith({
      organizerEmail: "organizer@example.com",
      provider: "PAYSTACK",
      userId: "org_123",
    });
  });

  it("updates an existing connected paystack payout account", async () => {
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
              business_name: "Campus Night Reloaded",
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
      isReadyForPaidEvents: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      email: "organizer@example.com",
    });
    paymentAccountRepository.findPaystackAccountByOrganizerId.mockResolvedValue({
      externalAccountCode: "ACCT_sub_123",
    });
    organizerPaymentsQueryService.getOrganizerPaystackReadiness.mockResolvedValue({
      organizerId: "org_123",
      isReadyForPaidEvents: true,
      payoutAccountCode: "ACCT_sub_123",
    });

    const result = await service.updateAccount(
      {
        accountType: "ORGANIZER",
        email: "organizer@example.com",
        id: "org_123",
      } as never,
      {
        accountHolderName: "Campus Night Limited",
        accountNumber: "0123456789",
        bankCode: "058",
        businessName: "Campus Night Reloaded",
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
      "https://api.paystack.co/subaccount/ACCT_sub_123",
      expect.objectContaining({
        method: "PUT",
      }),
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(requestBody).toEqual(
      expect.objectContaining({
        account_number: "0123456789",
        business_name: "Campus Night Reloaded",
        primary_contact_email: "organizer@example.com",
        primary_contact_name: "Campus Night Limited",
        settlement_bank: "058",
      }),
    );
    expect(result).toEqual({
      organizerId: "org_123",
      isReadyForPaidEvents: true,
      payoutAccountCode: "ACCT_sub_123",
    });
  });

  it("does not notify again when the payout account was already ready", async () => {
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
      firstReadyAt: new Date("2026-06-01T10:00:00.000Z"),
      isReadyForPaidEvents: true,
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
      payoutAccountCode: "ACCT_sub_123",
    });

    await service.refreshAccountStatusForOrganizer("org_123");

    expect(notificationsService.notifyOrganizerPayoutReady).not.toHaveBeenCalled();
  });
});
