import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { StaffRole } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ScannerMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const eventId = request.params.eventId;
    const user = request.authUser;

    if (!user) {
      throw new UnauthorizedException("Authenticated user context is missing.");
    }

    const membership = await this.prisma.staffMembership.findFirst({
      where: {
        eventId,
        userId: user.id,
        acceptedAt: {
          not: null,
        },
        role: {
          in: [StaffRole.OWNER, StaffRole.SCANNER],
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
        `User "${user.id}" is not authorized to operate the scanner for event "${eventId}".`,
      );
    }

    request.scannerMembership = membership;
    return true;
  }
}
