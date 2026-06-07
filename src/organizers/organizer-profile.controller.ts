import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { OrganizerProfileResponseDto } from "./dto/organizer-profile-response.dto";
import { UpsertOrganizerProfileDto } from "./dto/upsert-organizer-profile.dto";
import { OrganizerProfileService } from "./organizer-profile.service";

@ApiTags("organizer")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("organizer/profile")
export class OrganizerProfileController {
  constructor(
    private readonly organizerProfileService: OrganizerProfileService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get the current organizer profile",
  })
  @ApiOkResponse({
    type: OrganizerProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Authentication required",
  })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerProfileService.getProfile(user);
  }

  @Post()
  @ApiOperation({
    summary: "Create or replace organizer profile details",
  })
  @ApiOkResponse({
    type: OrganizerProfileResponseDto,
  })
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertOrganizerProfileDto,
  ) {
    return this.organizerProfileService.upsertProfile(user, payload);
  }

  @Patch()
  @ApiOperation({
    summary: "Update organizer profile details",
  })
  @ApiOkResponse({
    type: OrganizerProfileResponseDto,
  })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertOrganizerProfileDto,
  ) {
    return this.organizerProfileService.upsertProfile(user, payload);
  }
}
