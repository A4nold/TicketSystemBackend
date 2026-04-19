import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequestWithContext } from "../common/types/request-context.type";
import { RuntimeReportDto } from "./dto/runtime-report.dto";
import { MonitoringService } from "./monitoring.service";

@ApiTags("monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post("runtime")
  @HttpCode(202)
  @ApiOperation({
    summary: "Capture frontend or mobile runtime incidents for first-event support",
  })
  captureRuntimeReport(
    @Body() payload: RuntimeReportDto,
    @Req() request: RequestWithContext,
  ) {
    return this.monitoringService.captureRuntimeReport(payload, request.requestId);
  }
}
