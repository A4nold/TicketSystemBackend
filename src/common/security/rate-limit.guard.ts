import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { isSecurityRelaxedLocalEnabled } from "../env-security";
import { RequestWithContext } from "../types/request-context.type";
import { RATE_LIMIT_METADATA_KEY, type RateLimitConfig } from "./rate-limit.decorator";

type BucketState = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, BucketState>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isDisabled()) {
      return true;
    }

    const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const now = Date.now();
    const clientIp = this.resolveClientIp(request);
    const key = `${config.keyPrefix}:${clientIp}`;
    const current = this.buckets.get(key);

    if (!current || current.expiresAt <= now) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: now + config.windowMs,
      });
      this.maybeCleanup(now);
      return true;
    }

    if (current.count >= config.maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.expiresAt - now) / 1000),
      );
      this.logger.warn(
        `security.rate_limit.blocked keyPrefix=${config.keyPrefix} ip=${clientIp} retryAfter=${retryAfterSeconds}s`,
      );
      throw new HttpException(
        `Too many requests. Retry in about ${retryAfterSeconds} seconds.`,
        429,
      );
    }

    current.count += 1;
    this.buckets.set(key, current);
    return true;
  }

  private resolveClientIp(request: RequestWithContext) {
    if (typeof request.ip === "string" && request.ip.trim().length > 0) {
      return request.ip.trim();
    }

    const forwardedFor = request.headers["x-forwarded-for"];

    if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
      return forwardedFor.split(",")[0]!.trim();
    }

    return "unknown";
  }

  private isDisabled() {
    if (isSecurityRelaxedLocalEnabled() && process.env.NODE_ENV !== "production") {
      return true;
    }

    const raw = process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase();

    if (!raw) {
      return false;
    }

    return ["0", "false", "off", "no"].includes(raw);
  }

  private maybeCleanup(now: number) {
    if (this.buckets.size < 5000) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
