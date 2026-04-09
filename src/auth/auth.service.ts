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
        accountType: payload.accountType ?? "ATTENDEE",
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
      select: this.authUserSelect(),
    });

    return this.issueToken(user);
  }

  async login(payload: LoginDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        ...this.authUserSelect(),
        passwordHash: true,
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
      select: this.authUserSelect(),
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
      select: this.authUserSelect(),
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
      accountType: authUser.accountType,
      status: authUser.status,
      profile: {
        firstName: authUser.firstName,
        lastName: authUser.lastName,
      },
      platformRoles: authUser.platformRoles,
      appRoles: authUser.appRoles,
      memberships: authUser.memberships,
    };
  }

  private issueToken(user: {
    id: string;
    email: string;
    accountType: "ATTENDEE" | "ORGANIZER";
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

  private authUserSelect() {
    return {
      id: true as const,
      email: true as const,
      accountType: true as const,
      status: true as const,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      staffMemberships: {
        select: {
          id: true,
          eventId: true,
          role: true,
          acceptedAt: true,
        },
        orderBy: {
          invitedAt: "desc" as const,
        },
      },
    };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    accountType: "ATTENDEE" | "ORGANIZER";
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
    const platformRoles = this.derivePlatformRoles(user.accountType);

    return {
      id: user.id,
      email: user.email,
      accountType: user.accountType,
      status: user.status,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      platformRoles,
      appRoles: this.deriveAppRoles(platformRoles, memberships),
      memberships,
    };
  }

  private derivePlatformRoles(accountType: "ATTENDEE" | "ORGANIZER") {
    if (accountType === "ORGANIZER") {
      return ["EVENT_OWNER"];
    }

    return [];
  }

  private deriveAppRoles(
    platformRoles: string[],
    memberships: Array<{
      acceptedAt: string | null;
      role: StaffRole;
    }>,
  ) {
    const appRoles = new Set(["attendee"]);

    if (platformRoles.includes("EVENT_OWNER")) {
      appRoles.add("organizer");
    }

    for (const membership of memberships) {
      if (!membership.acceptedAt) {
        continue;
      }

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
