import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DisputeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByOrganizerId(organizerId: string, limit = 50) {
    return this.prisma.dispute.findMany({
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
