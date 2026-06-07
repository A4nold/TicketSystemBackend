import { Injectable } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { paymentTransactionDetailInclude } from "../queries/payment-transaction.include";

@Injectable()
export class PaymentTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: paymentTransactionDetailInclude(),
    });
  }

  findByOrderId(orderId: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: { orderId },
      orderBy: {
        createdAt: "desc",
      },
      include: paymentTransactionDetailInclude(),
    });
  }

  findByProviderPaymentIntentId(
    provider: PaymentProvider,
    providerPaymentIntentId: string,
  ) {
    return this.prisma.paymentTransaction.findUnique({
      where: {
        provider_providerPaymentIntentId: {
          provider,
          providerPaymentIntentId,
        },
      },
      include: paymentTransactionDetailInclude(),
    });
  }

  findByProviderChargeId(provider: PaymentProvider, providerChargeId: string) {
    return this.prisma.paymentTransaction.findUnique({
      where: {
        provider_providerChargeId: {
          provider,
          providerChargeId,
        },
      },
      include: paymentTransactionDetailInclude(),
    });
  }

  listByOrganizerId(organizerId: string, limit = 50) {
    return this.prisma.paymentTransaction.findMany({
      where: { organizerId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: paymentTransactionDetailInclude(),
    });
  }

  listByEventId(eventId: string, limit = 50) {
    return this.prisma.paymentTransaction.findMany({
      where: { eventId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: paymentTransactionDetailInclude(),
    });
  }
}
