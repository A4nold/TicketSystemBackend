import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

import { RequestWithContext } from "../types/request-context.type";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithContext>();
    const response = ctx.getResponse<Response>();

    const requestId = request.requestId ?? "unknown";
    const method = request.method;
    const path = request.url;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = this.resolveMessage(exceptionResponse, exception);
    const error =
      exception instanceof HttpException
        ? HttpStatus[status] ?? "Http Exception"
        : "Internal Server Error";

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${method} ${path} -> ${status} ${error}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${method} ${path} -> ${status} ${error}: ${message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path,
    });
  }

  private resolveMessage(
    exceptionResponse: unknown,
    exception: unknown,
  ): string | string[] {
    if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return "An unexpected error occurred.";
  }
}
