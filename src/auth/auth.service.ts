import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException(
        `A user with email "${normalizedEmail}" already exists.`,
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        profile: {
          create: {
            firstName: payload.firstName?.trim(),
            lastName: payload.lastName?.trim(),
            phoneNumber: payload.phoneNumber?.trim(),
          },
        },
      },
      include: this.authUserInclude(),
    });

    return this.issueToken(user);
  }

  async login(payload: LoginDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        status: true,
        passwordHash: true,
        ...this.authUserInclude(),
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return this.issueToken(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: this.authUserInclude(),
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    return this.toAuthUser(user);
  }

  async validateJwtUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: this.authUserInclude(),
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    const authUser = this.toAuthUser(user);

    return {
      id: authUser.id,
      email: authUser.email,
      status: authUser.status,
      profile: {
        firstName: authUser.firstName,
        lastName: authUser.lastName,
      },
      appRoles: authUser.appRoles,
      memberships: authUser.memberships,
    };
  }

  private issueToken(user: {
    id: string;
    email: string;
    status: string;
    staffMemberships?: Array<{
      id: string;
      eventId: string;
      role: StaffRole;
      acceptedAt: Date | null;
    }>;
    profile?: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      tokenType: "Bearer",
      user: this.toAuthUser(user),
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private authUserInclude() {
    return {
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      staffMemberships: {
        where: {
          acceptedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          eventId: true,
          role: true,
          acceptedAt: true,
        },
        orderBy: {
          acceptedAt: "desc" as const,
        },
      },
    };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    status: string;
    profile?: {
      firstName: string | null;
      lastName: string | null;
    } | null;
    staffMemberships?: Array<{
      id: string;
      eventId: string;
      role: StaffRole;
      acceptedAt: Date | null;
    }>;
  }) {
    const memberships = (user.staffMemberships ?? []).map((membership) => ({
      id: membership.id,
      eventId: membership.eventId,
      role: membership.role,
      acceptedAt: membership.acceptedAt?.toISOString() ?? null,
    }));

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      appRoles: this.deriveAppRoles(memberships),
      memberships,
    };
  }

  private deriveAppRoles(
    memberships: Array<{
      role: StaffRole;
    }>,
  ) {
    const appRoles = new Set(["attendee"]);

    for (const membership of memberships) {
      if (membership.role === StaffRole.OWNER || membership.role === StaffRole.ADMIN) {
        appRoles.add("organizer");
      }

      if (membership.role === StaffRole.SCANNER) {
        appRoles.add("scanner");
      }
    }

    return Array.from(appRoles);
  }
}
