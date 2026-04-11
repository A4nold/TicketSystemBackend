import { Injectable } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { BuyResaleListingDto } from "./dto/buy-resale-listing.dto";
import { CancelResaleListingDto } from "./dto/cancel-resale-listing.dto";
import { CreateResaleListingDto } from "./dto/create-resale-listing.dto";
import { BuyResaleListingService } from "./buy-resale-listing.service";
import { CancelResaleListingService } from "./cancel-resale-listing.service";
import { CreateResaleListingService } from "./create-resale-listing.service";
import { PublicResaleQueryService } from "./public-resale-query.service";

@Injectable()
export class ResaleService {
  constructor(
    private readonly publicResaleQueryService: PublicResaleQueryService,
    private readonly createResaleListingService: CreateResaleListingService,
    private readonly buyResaleListingService: BuyResaleListingService,
    private readonly cancelResaleListingService: CancelResaleListingService,
  ) {}

  async listPublicListings(eventSlug: string) {
    return this.publicResaleQueryService.listPublicListings(eventSlug);
  }

  async createListing(
    serialNumber: string,
    payload: CreateResaleListingDto,
    user: AuthenticatedUser,
  ) {
    return this.createResaleListingService.createListing(
      serialNumber,
      payload,
      user,
    );
  }

  async buyListing(
    serialNumber: string,
    payload: BuyResaleListingDto,
    user: AuthenticatedUser,
  ) {
    return this.buyResaleListingService.buyListing(serialNumber, payload, user);
  }

  async cancelListing(
    serialNumber: string,
    payload: CancelResaleListingDto,
    user: AuthenticatedUser,
  ) {
    return this.cancelResaleListingService.cancelListing(
      serialNumber,
      payload,
      user,
    );
  }
}
