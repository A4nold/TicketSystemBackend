import { Injectable } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProviderEventId(providerEventId: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { providerEventId },
    });
  }

  listRecentFailures(provider: PaymentProvider, limit = 25) {
    return this.prisma.webhookEvent.findMany({
      where: {
        provider,
        processingError: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  listFailures(limit = 25, provider?: PaymentProvider) {
    return this.prisma.webhookEvent.findMany({
      where: {
        ...(provider ? { provider } : {}),
        processingError: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }
}
