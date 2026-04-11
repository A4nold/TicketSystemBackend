import { Injectable } from "@nestjs/common";
import { ResaleStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { toPublicResaleListingResponse } from "./mappers/public-resale-listing.mapper";

@Injectable()
export class PublicResaleQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicListings(eventSlug: string) {
    const listings = await this.prisma.resaleListing.findMany({
      where: {
        status: ResaleStatus.LISTED,
        event: {
          allowResale: true,
          slug: eventSlug,
        },
      },
      orderBy: {
        listedAt: "desc",
      },
      include: {
        event: true,
        ticket: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    return listings.map((listing) => toPublicResaleListingResponse(listing));
  }
}
