import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Redirect,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

@ApiExcludeController()
@Controller("payments")
export class PaymentsReturnsController {
  @Get("stripe/return")
  @Redirect()
  handleStripeReturn(
    @Query("target") target?: string,
    @Query("scheme") scheme?: string,
    @Query("path") path?: string,
    @Query("fallback") fallback?: string,
    @Query() query?: Record<string, string | undefined>,
  ) {
    const safeTarget = this.resolveSafeReturnTarget(target, scheme, path);
    const safeFallback = this.resolveSafeFallback(fallback);
    const selectedBaseUrl = safeTarget ?? safeFallback;

    if (!selectedBaseUrl) {
      throw new BadRequestException("A valid Stripe return destination is required.");
    }

    const redirectUrl = new URL(selectedBaseUrl);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (
        !value ||
        key === "target" ||
        key === "scheme" ||
        key === "path" ||
        key === "fallback"
      ) {
        continue;
      }
      redirectUrl.searchParams.set(key, value);
    }

    return { statusCode: 302, url: redirectUrl.toString() };
  }

  private resolveSafeReturnTarget(
    value?: string,
    scheme?: string,
    path?: string,
  ) {
    const schemeFromQuery = this.resolveSafeScheme(scheme);
    const pathFromQuery = this.resolveSafePath(path);

    if (schemeFromQuery && pathFromQuery) {
      return `${schemeFromQuery}://${pathFromQuery.replace(/^\//, "")}`;
    }

    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      return ["ticketsystem:", "exp:", "exps:"].includes(parsed.protocol)
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  }

  private resolveSafeScheme(value?: string) {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    return ["ticketsystem", "exp", "exps"].includes(normalized) ? normalized : null;
  }

  private resolveSafePath(value?: string) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith("/")) {
      return null;
    }

    return trimmed;
  }

  private resolveSafeFallback(value?: string) {
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
      return null;
    }
  }
}
