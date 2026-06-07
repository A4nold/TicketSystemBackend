import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OrganizerEarningRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByOrganizerId(organizerId: string, limit = 100) {
    return this.prisma.organizerEarning.findMany({
      where: { organizerId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }
}
