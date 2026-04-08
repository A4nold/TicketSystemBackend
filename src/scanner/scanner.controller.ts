import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import {
  CurrentScannerMembership,
  CurrentUser,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ScannerMembershipGuard } from "../auth/guards/scanner-membership.guard";
import {
  AuthenticatedScannerMembership,
  AuthenticatedUser,
} from "../auth/types/authenticated-user.type";
import {
  ScannerManifestResponseDto,
  ScannerSyncResponseDto,
  ScanValidationResponseDto,
} from "./dto/scanner-response.dto";
import { SyncScanAttemptsDto } from "./dto/sync-scan-attempts.dto";
import { ValidateScanDto } from "./dto/validate-scan.dto";
import { ScannerService } from "./scanner.service";

@ApiTags("scanner")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard, ScannerMembershipGuard)
@Controller("scanner/events/:eventId")
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get("manifest")
  @ApiOperation({
    summary: "Get scanner manifest for an event",
    description:
      "Returns ticket token, revision, and state data that a scanner can prefetch for degraded offline operation.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiOkResponse({
    description: "Scanner manifest response",
    type: ScannerManifestResponseDto,
  })
  @ApiNotFoundResponse({ description: "Event was not found" })
  getManifest(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentScannerMembership() membership: AuthenticatedScannerMembership,
  ) {
    return this.scannerService.getManifest(eventId, user, membership);
  }

  @Post("validate")
  @ApiOperation({
    summary: "Validate a scanned QR code",
    description:
      "Runs the authoritative ticket validation flow and records a scan attempt with valid, invalid, blocked, or already-used outcomes.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Ticket validation result",
    type: ScanValidationResponseDto,
  })
  @ApiNotFoundResponse({ description: "Event was not found" })
  validateTicket(
    @Param("eventId") eventId: string,
    @Body() payload: ValidateScanDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentScannerMembership() membership: AuthenticatedScannerMembership,
  ) {
    return this.scannerService.validateTicket(eventId, payload, user, membership);
  }

  @Post("sync")
  @ApiOperation({
    summary: "Sync offline scan attempts",
    description:
      "Accepts batches of scan attempts recorded offline and persists them against the target event and scan session.",
  })
  @ApiParam({
    name: "eventId",
    description: "Event identifier",
  })
  @ApiCreatedResponse({
    description: "Offline sync result",
    type: ScannerSyncResponseDto,
  })
  @ApiNotFoundResponse({ description: "Event was not found" })
  syncAttempts(
    @Param("eventId") eventId: string,
    @Body() payload: SyncScanAttemptsDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentScannerMembership() membership: AuthenticatedScannerMembership,
  ) {
    return this.scannerService.syncAttempts(eventId, payload, user, membership);
  }
}
