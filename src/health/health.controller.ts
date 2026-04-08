import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthResponseDto } from "./dto/health-response.dto";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Get service health status" })
  @ApiOkResponse({
    description: "Health status response",
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      status: "ok",
      service: "ticketsystem-api",
    };
  }
}
