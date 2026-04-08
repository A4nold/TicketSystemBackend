import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Response } from "express";

import { RequestWithContext } from "../types/request-context.type";

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const incomingRequestId = request.headers["x-request-id"];
    const requestId =
      typeof incomingRequestId === "string" && incomingRequestId.trim().length > 0
        ? incomingRequestId
        : this.generateRequestId();

    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    this.logger.log(
      `[${requestId}] --> ${request.method} ${request.originalUrl}`,
    );

    response.on("finish", () => {
      const durationMs = Date.now() - startedAt;

      this.logger.log(
        `[${requestId}] <-- ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
      );
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
