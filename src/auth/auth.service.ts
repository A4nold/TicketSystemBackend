import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  async requestPasswordReset(payload: ForgotPasswordDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return {
        message: "If an account exists for that email, a password reset link has been sent.",
      };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.sendPasswordResetEmail({
      email: user.email,
      expiresAt,
      resetUrl: this.buildPasswordResetUrl(rawToken),
    });

    return {
      message: "If an account exists for that email, a password reset link has been sent.",
    };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(payload.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() < Date.now() ||
      resetToken.user.status !== "ACTIVE"
    ) {
      throw new BadRequestException("This password reset link is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          usedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: {
            not: resetToken.id,
          },
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: "Your password has been reset successfully.",
    };
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

  private buildPasswordResetUrl(token: string) {
    const publicAppUrl =
      process.env.PUBLIC_APP_URL?.trim() ||
      process.env.FRONTEND_APP_URL?.trim() ||
      "http://localhost:3001";
    const baseUrl = publicAppUrl.replace(/\/$/, "");

    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async sendPasswordResetEmail(input: {
    email: string;
    expiresAt: Date;
    resetUrl: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.NOTIFICATIONS_FROM_EMAIL ?? "Ticket System <no-reply@ticketsystem.local>";
    const subject = "Reset your TicketSystem password";
    const text = [
      "We received a request to reset your TicketSystem password.",
      `Reset your password: ${input.resetUrl}`,
      `This link expires at: ${input.expiresAt.toISOString()}`,
      "If you did not request this change, you can ignore this email.",
    ].join("\n");
    const html = [
      "<p>We received a request to reset your TicketSystem password.</p>",
      `<p><a href="${input.resetUrl}">Reset your password</a></p>`,
      `<p>This link expires at <strong>${input.expiresAt.toISOString()}</strong>.</p>`,
      "<p>If you did not request this change, you can ignore this email.</p>",
    ].join("");

    if (!resendApiKey) {
      this.logger.log(
        `Password reset email preview -> to=${input.email} subject="${subject}" resetUrl=${input.resetUrl}`,
      );
      return { delivered: false, provider: "log-only" as const };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.email],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Password reset email failed: status=${response.status} body=${body}`,
      );
      return { delivered: false, provider: "resend" as const };
    }

    return { delivered: true, provider: "resend" as const };
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
