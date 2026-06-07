import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@Injectable()
export class AdminPaymentsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ authUser?: AuthenticatedUser }>();
    const user = request.authUser;

    if (!user) {
      throw new ForbiddenException("Authenticated user context is required.");
    }

    const hasAdminAccess = user.platformRoles.includes("PLATFORM_ADMIN");

    if (!hasAdminAccess) {
      throw new ForbiddenException("Admin payment operations are not permitted.");
    }

    return true;
  }
}
