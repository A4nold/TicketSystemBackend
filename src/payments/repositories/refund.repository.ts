import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByOrderId(orderId: string) {
    return this.prisma.refund.findMany({
      where: { orderId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listByPaymentTransactionId(paymentTransactionId: string) {
    return this.prisma.refund.findMany({
      where: { paymentTransactionId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findByProviderRefundId(providerRefundId: string) {
    return this.prisma.refund.findFirst({
      where: { providerRefundId },
    });
  }

  listByOrganizerId(organizerId: string, limit = 50) {
    return this.prisma.refund.findMany({
      where: {
        paymentTransaction: {
          organizerId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        paymentTransaction: {
          include: {
            event: true,
          },
        },
      },
    });
  }
}
