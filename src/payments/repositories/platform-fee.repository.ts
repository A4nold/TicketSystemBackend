import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PlatformFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByPaymentTransactionId(paymentTransactionId: string) {
    return this.prisma.platformFee.findMany({
      where: { paymentTransactionId },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
