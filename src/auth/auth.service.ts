import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
      include: {
        profile: true,
      },
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
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
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
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
    };
  }

  async validateJwtUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user was not found.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      profile: user.profile,
    };
  }

  private issueToken(user: {
    id: string;
    email: string;
    status: string;
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
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        firstName: user.profile?.firstName ?? null,
        lastName: user.profile?.lastName ?? null,
      },
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
