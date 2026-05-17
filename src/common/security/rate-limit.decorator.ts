import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_METADATA_KEY = "security:rate-limit";

export type RateLimitConfig = {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
};

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, config);
