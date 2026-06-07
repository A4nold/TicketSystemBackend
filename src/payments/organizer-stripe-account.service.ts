import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotImplementedException,
} from "@nestjs/common";
import { PaymentProvider, Prisma } from "@prisma/client";
import Stripe from "stripe";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { isStripeConnectOnboardingEnabled } from "../common/feature-flags";
import { PrismaService } from "../prisma/prisma.service";
import { OrganizerPaymentsQueryService } from "./organizer-payments-query.service";
import { PaymentAccountRepository } from "./repositories/payment-account.repository";
import { StripeConnectLinkDto } from "./dto/stripe-connect-link.dto";

@Injectable()
export class OrganizerStripeAccountService {
  private readonly logger = new Logger(OrganizerStripeAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizerPaymentsQueryService: OrganizerPaymentsQueryService,
    private readonly paymentAccountRepository: PaymentAccountRepository,
  ) {}

  async getAccountStatus(user: AuthenticatedUser) {
    this.assertConnectEnabled();
    this.assertOrganizer(user);

    await this.tryRefreshStripeAccount(user.id);
    return this.organizerPaymentsQueryService.getOrganizerStripeReadiness(user.id);
  }

  async createOrResumeOnboarding(
    user: AuthenticatedUser,
    payload: StripeConnectLinkDto,
  ) {
    this.assertConnectEnabled();
    this.assertOrganizer(user);

    const stripe = this.getStripeClient();
    const paymentAccount = await this.paymentAccountRepository.findStripeAccountByOrganizerId(
      user.id,
    );

    const stripeAccount = paymentAccount?.externalAccountId
      ? await stripe.accounts.retrieve(paymentAccount.externalAccountId)
      : await stripe.accounts.create({
          type: "express",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            organizerId: user.id,
          },
        });

    const accountRecord = await this.syncStripeAccountForOrganizer(user.id, stripeAccount);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: this.resolveRefreshUrl(payload.refreshUrl),
      return_url: this.resolveReturnUrl(payload.returnUrl),
      type: "account_onboarding",
    });

    this.logger.log(
      `payments.stripe.connect.onboarding_link_created organizerId=${user.id} accountId=${stripeAccount.id}`,
    );

    return {
      account:
        await this.organizerPaymentsQueryService.getOrganizerStripeReadiness(
          accountRecord.organizerId,
        ),
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at
        ? new Date(accountLink.expires_at * 1000)
        : null,
    };
  }

  async refreshOnboarding(user: AuthenticatedUser, payload: StripeConnectLinkDto) {
    return this.createOrResumeOnboarding(user, payload);
  }

  async syncFromStripeWebhook(account: any) {
    const existingAccount =
      await this.paymentAccountRepository.findByProviderAndExternalAccountId(
        PaymentProvider.STRIPE,
        account.id,
      );

    if (!existingAccount) {
      this.logger.warn(
        `payments.stripe.account_updated.unmapped accountId=${account.id}`,
      );
      return null;
    }

    return this.syncStripeAccountForOrganizer(existingAccount.organizerId, account);
  }

  private async syncStripeAccountForOrganizer(
    organizerId: string,
    account: any,
  ) {
    const requirements = account.requirements;
    const currentlyDue = requirements?.currently_due ?? [];
    const eventuallyDue = requirements?.eventually_due ?? [];
    const pastDue = requirements?.past_due ?? [];
    const disabledReason =
      requirements?.disabled_reason ?? account.future_requirements?.disabled_reason ?? null;
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;
    const now = new Date();

    const onboardingStatus = this.resolveOnboardingStatus({
      currentlyDue,
      detailsSubmitted,
      disabledReason,
    });
    const verificationStatus = this.resolveVerificationStatus({
      chargesEnabled,
      payoutsEnabled,
      currentlyDue,
      pastDue,
      disabledReason,
    });
    const status = this.resolveAccountStatus({
      chargesEnabled,
      payoutsEnabled,
      currentlyDue,
      pastDue,
      disabledReason,
    });
    const isReadyForPaidEvents =
      chargesEnabled &&
      payoutsEnabled &&
      currentlyDue.length === 0 &&
      pastDue.length === 0 &&
      !disabledReason;

    const syncedAccount = await this.prisma.paymentAccount.upsert({
      where: {
        organizerId_provider: {
          organizerId,
          provider: PaymentProvider.STRIPE,
        },
      },
      create: {
        organizerId,
        provider: PaymentProvider.STRIPE,
        externalAccountId: account.id,
        accountType: account.type?.toUpperCase() as
          | "EXPRESS"
          | "STANDARD"
          | "CUSTOM"
          | undefined,
        status,
        verificationStatus,
        onboardingStatus,
        payoutsEnabled,
        chargesEnabled,
        detailsSubmitted,
        country: account.country ?? null,
        defaultCurrency: account.default_currency?.toUpperCase() ?? null,
        currentlyDueRequirements: currentlyDue,
        eventuallyDueRequirements: eventuallyDue,
        pastDueRequirements: pastDue,
        onboardingCompletedAt:
          detailsSubmitted && currentlyDue.length === 0 ? now : null,
        requirementsDueBy: requirements?.current_deadline
          ? new Date(requirements.current_deadline * 1000)
          : null,
        requirementsSummary: this.buildRequirementsSummary(
          currentlyDue,
          pastDue,
          disabledReason,
        ),
        disabledReason,
        lastSyncedAt: now,
        metadata: account as unknown as Prisma.InputJsonValue,
      },
      update: {
        externalAccountId: account.id,
        accountType: account.type?.toUpperCase() as
          | "EXPRESS"
          | "STANDARD"
          | "CUSTOM"
          | undefined,
        status,
        verificationStatus,
        onboardingStatus,
        payoutsEnabled,
        chargesEnabled,
        detailsSubmitted,
        country: account.country ?? null,
        defaultCurrency: account.default_currency?.toUpperCase() ?? null,
        currentlyDueRequirements: currentlyDue,
        eventuallyDueRequirements: eventuallyDue,
        pastDueRequirements: pastDue,
        onboardingCompletedAt:
          detailsSubmitted && currentlyDue.length === 0
            ? now
            : undefined,
        requirementsDueBy: requirements?.current_deadline
          ? new Date(requirements.current_deadline * 1000)
          : null,
        requirementsSummary: this.buildRequirementsSummary(
          currentlyDue,
          pastDue,
          disabledReason,
        ),
        disabledReason,
        lastSyncedAt: now,
        metadata: account as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.organizerPaymentProfile.upsert({
      where: { organizerId },
      create: {
        organizerId,
        defaultSettlementCurrency: account.default_currency?.toUpperCase() ?? null,
        isReadyForPaidEvents,
        readinessCheckedAt: now,
        firstReadyAt: isReadyForPaidEvents ? now : null,
      },
      update: {
        defaultSettlementCurrency: account.default_currency?.toUpperCase() ?? null,
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
      `payments.stripe.account_synced organizerId=${organizerId} accountId=${account.id} chargesEnabled=${chargesEnabled} payoutsEnabled=${payoutsEnabled} ready=${isReadyForPaidEvents}`,
    );

    return syncedAccount;
  }

  private resolveOnboardingStatus(input: {
    currentlyDue: string[];
    detailsSubmitted: boolean;
    disabledReason: string | null;
  }) {
    if (input.disabledReason) {
      return "ACTION_REQUIRED" as const;
    }

    if (!input.detailsSubmitted) {
      return "IN_PROGRESS" as const;
    }

    if (input.currentlyDue.length > 0) {
      return "ACTION_REQUIRED" as const;
    }

    return "COMPLETED" as const;
  }

  private resolveVerificationStatus(input: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    currentlyDue: string[];
    pastDue: string[];
    disabledReason: string | null;
  }) {
    if (input.disabledReason && !input.chargesEnabled) {
      return "DISABLED" as const;
    }

    if (input.pastDue.length > 0 || input.disabledReason) {
      return "RESTRICTED" as const;
    }

    if (input.chargesEnabled && input.payoutsEnabled && input.currentlyDue.length === 0) {
      return "VERIFIED" as const;
    }

    return "PENDING" as const;
  }

  private resolveAccountStatus(input: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    currentlyDue: string[];
    pastDue: string[];
    disabledReason: string | null;
  }) {
    if (input.disabledReason && !input.chargesEnabled) {
      return "DISABLED" as const;
    }

    if (input.pastDue.length > 0 || input.disabledReason) {
      return "ACTION_REQUIRED" as const;
    }

    if (input.chargesEnabled && input.payoutsEnabled && input.currentlyDue.length === 0) {
      return "VERIFIED" as const;
    }

    return "PENDING" as const;
  }

  private buildRequirementsSummary(
    currentlyDue: string[],
    pastDue: string[],
    disabledReason: string | null,
  ) {
    const segments = [
      currentlyDue.length > 0 ? `currently_due:${currentlyDue.join(",")}` : null,
      pastDue.length > 0 ? `past_due:${pastDue.join(",")}` : null,
      disabledReason ? `disabled_reason:${disabledReason}` : null,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(" | ") : null;
  }

  private async tryRefreshStripeAccount(organizerId: string) {
    const paymentAccount = await this.paymentAccountRepository.findStripeAccountByOrganizerId(
      organizerId,
    );

    if (!paymentAccount?.externalAccountId) {
      return;
    }

    try {
      const stripe = this.getStripeClient();
      const stripeAccount = await stripe.accounts.retrieve(paymentAccount.externalAccountId);
      await this.syncStripeAccountForOrganizer(organizerId, stripeAccount);
    } catch (error) {
      this.logger.warn(
        `payments.stripe.account_sync_on_read_failed organizerId=${organizerId} accountId=${paymentAccount.externalAccountId} reason="${error instanceof Error ? error.message : "Unknown error"}"`,
      );
    }
  }

  private resolveReturnUrl(providedUrl?: string) {
    return this.resolveFrontendUrl(
      providedUrl,
      "/organizer/payments/stripe/return",
      "A Stripe Connect return URL could not be resolved.",
    );
  }

  private resolveRefreshUrl(providedUrl?: string) {
    return this.resolveFrontendUrl(
      providedUrl,
      "/organizer/payments/stripe/refresh",
      "A Stripe Connect refresh URL could not be resolved.",
    );
  }

  private resolveFrontendUrl(
    providedUrl: string | undefined,
    fallbackPath: string,
    errorMessage: string,
  ) {
    const candidate = providedUrl?.trim()
      ? providedUrl.trim()
      : process.env.FRONTEND_APP_URL?.trim() || process.env.PUBLIC_APP_URL?.trim() || null;

    if (!candidate) {
      throw new NotImplementedException(errorMessage);
    }

    try {
      const url = new URL(candidate);

      if (providedUrl?.trim()) {
        return url.toString();
      }

      url.pathname = `${url.pathname.replace(/\/$/, "")}${fallbackPath}`;
      url.search = "";
      return url.toString();
    } catch {
      throw new BadRequestException("Invalid Stripe Connect redirect URL.");
    }
  }

  private assertConnectEnabled() {
    if (!isStripeConnectOnboardingEnabled()) {
      throw new NotImplementedException(
        "Stripe Connect onboarding is not enabled for this environment.",
      );
    }
  }

  private assertOrganizer(user: AuthenticatedUser) {
    if (user.accountType !== "ORGANIZER") {
      throw new ForbiddenException("Only organizer accounts can connect Stripe.");
    }
  }

  private getStripeClient() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new NotImplementedException(
        "STRIPE_SECRET_KEY must be configured to use Stripe Connect.",
      );
    }

    const StripeConstructor = Stripe as unknown as new (
      apiKey: string,
      config?: Record<string, unknown>,
    ) => any;

    return new StripeConstructor(secretKey, {
      apiVersion: "2025-03-31.basil",
    });
  }
}
