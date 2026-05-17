import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

const AUTH_COOKIE_NAME = "ts_access_token";
const CSRF_COOKIE_NAME = "ts_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method: string;
      originalUrl?: string;
      url?: string;
    }>();

    if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const requestPath = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";
    if (CSRF_EXEMPT_PATHS.has(requestPath)) {
      return true;
    }

    const authorization = request.headers.authorization;
    if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      return true;
    }

    const cookieHeader =
      typeof request.headers.cookie === "string" ? request.headers.cookie : "";
    const authCookie = this.getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

    // Only enforce CSRF when browser cookie auth is in play.
    if (!authCookie) {
      return true;
    }

    const csrfCookie = this.getCookieValue(cookieHeader, CSRF_COOKIE_NAME);
    const csrfHeader = request.headers[CSRF_HEADER_NAME];
    const csrfToken =
      typeof csrfHeader === "string"
        ? csrfHeader
        : Array.isArray(csrfHeader)
          ? csrfHeader[0]
          : undefined;

    if (!csrfCookie || !csrfToken || csrfCookie !== csrfToken) {
      throw new ForbiddenException("CSRF token validation failed.");
    }

    return true;
  }

  private getCookieValue(cookieHeader: string, key: string) {
    const targetKey = `${key}=`;
    const rawValue = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(targetKey))
      ?.slice(targetKey.length);

    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
}
