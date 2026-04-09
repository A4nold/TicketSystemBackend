import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { StaffRole } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { EVENT_ROLE_METADATA_KEY } from "../decorators/require-event-roles.decorator";

@Injectable()
export class EventMembershipGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const eventId = request.params.eventId;
    const user = request.authUser;

    if (!user) {
      throw new UnauthorizedException("Authenticated user context is missing.");
    }

    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(
      EVENT_ROLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        eventId,
        userId: user.id,
        acceptedAt: {
          not: null,
        },
        role: {
          in: requiredRoles,
        },
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
        role: true,
        acceptedAt: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        `User "${user.id}" is not authorized for event "${eventId}".`,
      );
    }

    request.eventMembership = membership;
    request.scannerMembership = membership;

    return true;
  }
}
