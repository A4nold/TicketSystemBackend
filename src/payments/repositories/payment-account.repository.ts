import { Injectable } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PaymentAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrganizerPaymentProfile(organizerId: string) {
    return this.prisma.organizerPaymentProfile.findUnique({
      where: { organizerId },
    });
  }

  findStripeAccountByOrganizerId(organizerId: string) {
    return this.prisma.paymentAccount.findUnique({
      where: {
        organizerId_provider: {
          organizerId,
          provider: PaymentProvider.STRIPE,
        },
      },
    });
  }

  findPaystackAccountByOrganizerId(organizerId: string) {
    return this.prisma.paymentAccount.findUnique({
      where: {
        organizerId_provider: {
          organizerId,
          provider: PaymentProvider.PAYSTACK,
        },
      },
    });
  }

  findByProviderAndExternalAccountId(
    provider: PaymentProvider,
    externalAccountId: string,
  ) {
    return this.prisma.paymentAccount.findUnique({
      where: {
        provider_externalAccountId: {
          provider,
          externalAccountId,
        },
      },
    });
  }

  listActionRequiredStripeAccounts(limit = 50) {
    return this.prisma.paymentAccount.findMany({
      where: {
        provider: PaymentProvider.STRIPE,
        OR: [
          { status: "ACTION_REQUIRED" },
          { onboardingStatus: "ACTION_REQUIRED" },
          { verificationStatus: "RESTRICTED" },
          { chargesEnabled: false },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    });
  }
}
