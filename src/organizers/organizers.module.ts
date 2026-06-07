import { Module } from "@nestjs/common";

import { OrganizerPaymentProviderController } from "./organizer-payment-provider.controller";
import { OrganizerPaymentProviderService } from "./organizer-payment-provider.service";
import { OrganizerProfileController } from "./organizer-profile.controller";
import { OrganizerProfileService } from "./organizer-profile.service";

@Module({
  controllers: [OrganizerProfileController, OrganizerPaymentProviderController],
  providers: [OrganizerProfileService, OrganizerPaymentProviderService],
  exports: [OrganizerProfileService, OrganizerPaymentProviderService],
})
export class OrganizersModule {}
