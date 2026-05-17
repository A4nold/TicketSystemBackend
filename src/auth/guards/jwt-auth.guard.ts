import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { AuthService } from "../auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const bearerToken =
      typeof authorization === "string" ? this.parseBearerToken(authorization) : null;
    const cookieToken = this.readCookieToken(request.headers.cookie);
    const token = bearerToken ?? cookieToken;

    if (!token) {
      throw new UnauthorizedException(
        'Missing required "Authorization: Bearer <token>" header or auth cookie.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token);

      request.authUser = await this.authService.validateJwtUser(payload.sub);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }
  }

  private parseBearerToken(authorization: string) {
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid bearer token format.");
    }

    return token;
  }

  private readCookieToken(cookieHeader: unknown) {
    if (typeof cookieHeader !== "string" || cookieHeader.trim().length === 0) {
      return null;
    }

    const targetKey = "ts_access_token=";
    const value = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(targetKey))
      ?.slice(targetKey.length);

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
}
