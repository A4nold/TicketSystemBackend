import { Injectable, Logger } from "@nestjs/common";

import { RuntimeReportDto } from "./dto/runtime-report.dto";

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  captureRuntimeReport(payload: RuntimeReportDto, requestId?: string) {
    const metadataSummary = payload.metadata
      ? JSON.stringify(payload.metadata).slice(0, 1000)
      : "none";

    this.logger.error(
      `runtime_report surface=${payload.surface} type=${payload.type} route=${payload.route ?? "unknown"} component=${payload.component ?? "unknown"} requestId=${requestId ?? "none"} message="${payload.message}" metadata=${metadataSummary}`,
      payload.stack,
    );

    return {
      accepted: true,
    };
  }
}
