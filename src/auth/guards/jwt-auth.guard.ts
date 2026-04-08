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

    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException(
        'Missing required "Authorization: Bearer <token>" header.',
      );
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid bearer token format.");
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
}
