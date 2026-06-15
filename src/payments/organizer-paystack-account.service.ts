import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotImplementedException,
  NotFoundException,
} from "@nestjs/common";
import { PaymentProvider, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { isPaystackOrganizerOnboardingEnabled } from "../common/feature-flags";
import { PrismaService } from "../prisma/prisma.service";
import { OrganizerPaymentsQueryService } from "./organizer-payments-query.service";
import {
  ResolvePaystackBankAccountDto,
  UpsertPaystackOrganizerAccountDto,
} from "./dto/paystack-organizer-account.dto";
import { PaymentAccountRepository } from "./repositories/payment-account.repository";

type PaystackBankListResponse = {
  data?: Array<{
    code?: string;
    name?: string;
    slug?: string | null;
  }>;
};

type PaystackResolveAccountResponse = {
  data?: {
    account_name?: string;
    account_number?: string;
    bank_id?: number | null;
  };
};

type PaystackCreateSubaccountResponse = {
  data?: {
    id?: number | string;
    subaccount_code?: string;
    active?: boolean;
    is_verified?: boolean;
    settlement_schedule?: string | null;
    currency?: string | null;
    business_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    bank?: number | string | null;
  };
};

@Injectable()
export class OrganizerPaystackAccountService {
  private readonly logger = new Logger(OrganizerPaystackAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerPaymentsQueryService: OrganizerPaymentsQueryService,
    private readonly paymentAccountRepository: PaymentAccountRepository,
  ) {}

  async getAccountStatus(user: AuthenticatedUser) {
    this.assertPaystackEnabled();
    this.assertOrganizer(user);
    return this.refreshAccountStatusForOrganizer(user.id);
  }

  async refreshAccountStatusForOrganizer(organizerId: string) {
    const existingAccount =
      await this.paymentAccountRepository.findPaystackAccountByOrganizerId(organizerId);

    if (!existingAccount?.externalAccountCode) {
      return this.organizerPaymentsQueryService.getOrganizerPaystackReadiness(organizerId);
    }

    try {
      const subaccount = await this.getPaystackSubaccount(existingAccount.externalAccountCode);
      await this.syncExistingPaystackSubaccountForOrganizer(organizerId, subaccount);
    } catch (error) {
      this.logger.warn(
        `payments.paystack.account_refresh.failed organizerId=${organizerId} subaccountCode=${existingAccount.externalAccountCode} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
    }

    return this.organizerPaymentsQueryService.getOrganizerPaystackReadiness(organizerId);
  }

  async listBanks(user: AuthenticatedUser) {
    this.assertPaystackEnabled();
    this.assertOrganizer(user);

    const response = await this.paystackFetch<PaystackBankListResponse>("/bank?country=nigeria", {
      method: "GET",
    });

    return (response.data ?? [])
      .map((bank) => ({
        code: bank.code?.trim() ?? "",
        name: bank.name?.trim() ?? "",
        slug: bank.slug ?? null,
      }))
      .filter((bank) => bank.code && bank.name)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async resolveBankAccount(
    user: AuthenticatedUser,
    payload: ResolvePaystackBankAccountDto,
  ) {
    this.assertPaystackEnabled();
    this.assertOrganizer(user);

    return this.resolvePaystackBankAccount(payload);
  }

  async createAccount(user: AuthenticatedUser, payload: UpsertPaystackOrganizerAccountDto) {
    this.assertPaystackEnabled();
    this.assertOrganizer(user);

    const existingAccount = await this.paymentAccountRepository.findPaystackAccountByOrganizerId(
      user.id,
    );

    if (existingAccount) {
      throw new BadRequestException(
        "A Paystack organizer payout profile already exists. Update it instead.",
      );
    }

    const resolvedAccount = await this.resolvePaystackBankAccount(payload);
    const subaccount = await this.createPaystackSubaccount(user, payload, resolvedAccount);
    await this.syncPaystackSubaccountForOrganizer(user.id, payload, resolvedAccount, subaccount);
    return this.organizerPaymentsQueryService.getOrganizerPaystackReadiness(user.id);
  }

  async updateAccount(user: AuthenticatedUser, payload: UpsertPaystackOrganizerAccountDto) {
    this.assertPaystackEnabled();
    this.assertOrganizer(user);

    const existingAccount = await this.paymentAccountRepository.findPaystackAccountByOrganizerId(
      user.id,
    );

    if (!existingAccount) {
      throw new NotFoundException(
        "No Paystack organizer payout profile exists yet. Create one first.",
      );
    }

    if (existingAccount.externalAccountCode) {
      throw new BadRequestException(
        "Updating live Paystack payout accounts will be handled in a follow-up wave. This account is already connected.",
      );
    }

    const resolvedAccount = await this.resolvePaystackBankAccount(payload);
    const subaccount = await this.createPaystackSubaccount(user, payload, resolvedAccount);
    await this.syncPaystackSubaccountForOrganizer(user.id, payload, resolvedAccount, subaccount);
    return this.organizerPaymentsQueryService.getOrganizerPaystackReadiness(user.id);
  }

  private async validateOrganizerPayoutRegion(organizerId: string) {
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerId },
      select: {
        country: true,
        defaultPayoutCurrency: true,
      },
    });

    const normalizedCountry = organizerProfile?.country?.toUpperCase() ?? null;
    const normalizedCurrency =
      organizerProfile?.defaultPayoutCurrency?.toUpperCase() ?? null;

    if (normalizedCountry !== "NG") {
      throw new BadRequestException(
        "Paystack organizer onboarding currently requires organizer country NG.",
      );
    }

    if (normalizedCurrency !== "NGN") {
      throw new BadRequestException(
        "Paystack organizer onboarding currently requires organizer payout currency NGN.",
      );
    }

    return {
      normalizedCountry,
      normalizedCurrency,
    };
  }

  private async syncPaystackSubaccountForOrganizer(
    organizerId: string,
    payload: UpsertPaystackOrganizerAccountDto,
    resolvedAccount: {
      accountName: string;
      accountNumber: string;
      bankCode: string;
      bankId: number | null;
    },
    subaccount: NonNullable<PaystackCreateSubaccountResponse["data"]>,
  ) {
    await this.persistPaystackSubaccountStatus(organizerId, {
      accountHolderName: resolvedAccount.accountName,
      accountNumber: resolvedAccount.accountNumber,
      bankCode: resolvedAccount.bankCode,
      bankId: resolvedAccount.bankId,
      businessName: payload.businessName.trim(),
      subaccount,
    });
  }

  private async syncExistingPaystackSubaccountForOrganizer(
    organizerId: string,
    subaccount: NonNullable<PaystackCreateSubaccountResponse["data"]>,
  ) {
    const existingAccount =
      await this.paymentAccountRepository.findPaystackAccountByOrganizerId(organizerId);
    const paystackMetadata =
      existingAccount?.metadata &&
      typeof existingAccount.metadata === "object" &&
      !Array.isArray(existingAccount.metadata)
        ? ((existingAccount.metadata as Record<string, unknown>).paystack as
            | Record<string, unknown>
            | undefined)
        : undefined;

    await this.persistPaystackSubaccountStatus(organizerId, {
      accountHolderName:
        typeof paystackMetadata?.accountHolderName === "string"
          ? paystackMetadata.accountHolderName
          : subaccount.account_name?.trim() ?? "",
      accountNumber: subaccount.account_number?.trim() ?? "",
      bankCode:
        typeof paystackMetadata?.bankCode === "string" ? paystackMetadata.bankCode : "",
      bankId:
        typeof subaccount.bank === "number"
          ? subaccount.bank
          : typeof subaccount.bank === "string" && /^\d+$/.test(subaccount.bank)
            ? Number(subaccount.bank)
            : null,
      businessName:
        typeof paystackMetadata?.businessName === "string"
          ? paystackMetadata.businessName
          : subaccount.business_name?.trim() ?? "",
      subaccount,
    });
  }

  private async persistPaystackSubaccountStatus(
    organizerId: string,
    input: {
      accountHolderName: string;
      accountNumber: string;
      bankCode: string;
      bankId: number | null;
      businessName: string;
      subaccount: NonNullable<PaystackCreateSubaccountResponse["data"]>;
    },
  ) {
    const { normalizedCountry, normalizedCurrency } =
      await this.validateOrganizerPayoutRegion(organizerId);
    const now = new Date();
    const subaccountCode = input.subaccount.subaccount_code?.trim();
    const externalAccountId = String(input.subaccount.id ?? subaccountCode ?? organizerId);
    const isActive = input.subaccount.active === true;
    const isVerified = input.subaccount.is_verified === true;
    const isReadyForPaidEvents = isActive && isVerified;
    const normalizedAccountNumber = input.accountNumber.trim();

    const accountMetadata = {
      paystack: {
        accountHolderName: input.accountHolderName,
        accountNumberLast4: normalizedAccountNumber
          ? normalizedAccountNumber.slice(-4)
          : null,
        bankCode: input.bankCode || null,
        bankId: input.bankId,
        businessName: input.businessName,
        isActive,
        isVerified,
        maskedAccountNumber: normalizedAccountNumber
          ? this.maskAccountNumber(normalizedAccountNumber)
          : null,
        onboardingPhase: isReadyForPaidEvents ? "SUBACCOUNT_READY" : "SUBACCOUNT_CREATED",
        settlementSchedule: input.subaccount.settlement_schedule ?? null,
        subaccountRaw: input.subaccount,
      },
    } satisfies Prisma.InputJsonValue;

    await this.prisma.paymentAccount.upsert({
      where: {
        organizerId_provider: {
          organizerId,
          provider: PaymentProvider.PAYSTACK,
        },
      },
      create: {
        organizerId,
        provider: PaymentProvider.PAYSTACK,
        externalAccountId,
        externalAccountCode: subaccountCode ?? null,
        status: isReadyForPaidEvents ? "VERIFIED" : isActive ? "PENDING" : "ACTION_REQUIRED",
        verificationStatus: isVerified ? "VERIFIED" : "PENDING",
        onboardingStatus: "COMPLETED",
        payoutsEnabled: isReadyForPaidEvents,
        chargesEnabled: isActive,
        detailsSubmitted: true,
        country: normalizedCountry,
        defaultCurrency: normalizedCurrency,
        onboardingCompletedAt: now,
        requirementsSummary: isReadyForPaidEvents
          ? "Paystack organizer payouts are ready for paid events."
          : "Paystack subaccount created. Verification or activation still needs attention before paid events go live.",
        lastSyncedAt: now,
        metadata: accountMetadata,
      },
      update: {
        externalAccountId,
        externalAccountCode: subaccountCode ?? null,
        status: isReadyForPaidEvents ? "VERIFIED" : isActive ? "PENDING" : "ACTION_REQUIRED",
        verificationStatus: isVerified ? "VERIFIED" : "PENDING",
        onboardingStatus: "COMPLETED",
        payoutsEnabled: isReadyForPaidEvents,
        chargesEnabled: isActive,
        detailsSubmitted: true,
        country: normalizedCountry,
        defaultCurrency: normalizedCurrency,
        onboardingCompletedAt: now,
        requirementsSummary: isReadyForPaidEvents
          ? "Paystack organizer payouts are ready for paid events."
          : "Paystack subaccount created. Verification or activation still needs attention before paid events go live.",
        disabledReason: isReadyForPaidEvents
          ? null
          : "Paystack subaccount is not fully verified or active yet.",
        lastSyncedAt: now,
        metadata: accountMetadata,
      },
    });

    await this.prisma.organizerPaymentProfile.upsert({
      where: { organizerId },
      create: {
        organizerId,
        defaultSettlementCurrency: normalizedCurrency,
        isReadyForPaidEvents,
        readinessCheckedAt: now,
        firstReadyAt: isReadyForPaidEvents ? now : null,
      },
      update: {
        defaultSettlementCurrency: normalizedCurrency,
        isReadyForPaidEvents,
        readinessCheckedAt: now,
        ...(isReadyForPaidEvents
          ? {
              firstReadyAt: {
                set: (
                  await this.prisma.organizerPaymentProfile.findUnique({
                    where: { organizerId },
                    select: { firstReadyAt: true },
                  })
                )?.firstReadyAt ?? now,
              },
            }
          : {}),
      },
    });

    this.logger.log(
      `payments.paystack.account_synced organizerId=${organizerId} subaccountCode=${subaccountCode ?? "missing"} active=${isActive} verified=${isVerified} ready=${isReadyForPaidEvents}`,
    );
  }

  private async resolvePaystackBankAccount(
    payload: ResolvePaystackBankAccountDto | UpsertPaystackOrganizerAccountDto,
  ) {
    const bankCode = payload.bankCode.trim();
    const accountNumber = payload.accountNumber.trim();
    const params = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });

    const response = await this.paystackFetch<PaystackResolveAccountResponse>(
      `/bank/resolve?${params.toString()}`,
      {
        method: "GET",
      },
    );

    const accountName = response.data?.account_name?.trim();
    const resolvedAccountNumber = response.data?.account_number?.trim() ?? accountNumber;

    if (!accountName) {
      throw new BadRequestException("Paystack could not resolve that bank account.");
    }

    return {
      accountName,
      accountNumber: resolvedAccountNumber,
      bankCode,
      bankId: response.data?.bank_id ?? null,
    };
  }

  private async createPaystackSubaccount(
    user: AuthenticatedUser,
    payload: UpsertPaystackOrganizerAccountDto,
    resolvedAccount: {
      accountName: string;
      accountNumber: string;
    },
  ) {
    const response = await this.paystackFetch<PaystackCreateSubaccountResponse>("/subaccount", {
      body: JSON.stringify({
        account_number: resolvedAccount.accountNumber,
        business_name: payload.businessName.trim(),
        percentage_charge: 0,
        primary_contact_email: user.email,
        primary_contact_name: resolvedAccount.accountName,
        settlement_bank: payload.bankCode.trim(),
      }),
      method: "POST",
    });

    if (!response.data?.subaccount_code) {
      throw new BadRequestException("Paystack did not return a valid organizer subaccount.");
    }

    return response.data;
  }

  private async getPaystackSubaccount(subaccountCode: string) {
    const response = await this.paystackFetch<PaystackCreateSubaccountResponse>(
      `/subaccount/${encodeURIComponent(subaccountCode)}`,
      {
        method: "GET",
      },
    );

    if (!response.data?.subaccount_code) {
      throw new BadRequestException("Paystack did not return a valid organizer subaccount.");
    }

    return response.data;
  }

  private async paystackFetch<T>(path: string, init: RequestInit = {}) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new NotImplementedException(
        "PAYSTACK_SECRET_KEY must be configured to use Paystack organizer onboarding.",
      );
    }

    const response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new BadRequestException(
        responseBody?.message ?? `Paystack request failed with ${response.status}.`,
      );
    }

    return responseBody as T;
  }

  private assertPaystackEnabled() {
    if (!isPaystackOrganizerOnboardingEnabled()) {
      throw new ForbiddenException("Paystack organizer onboarding is not enabled.");
    }
  }

  private assertOrganizer(user: AuthenticatedUser) {
    if (user.accountType !== "ORGANIZER") {
      throw new ForbiddenException("Only organizer accounts can configure payout providers.");
    }
  }

  private maskAccountNumber(accountNumber: string) {
    const last4 = accountNumber.slice(-4);
    return `****${last4}`;
  }
}
