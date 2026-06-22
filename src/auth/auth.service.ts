import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  PushDeviceStatus,
  StaffRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly ORGANIZER_ONBOARDING_STATUS = {
    NOT_STARTED: "NOT_STARTED",
    PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
  } as const;

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

    await this.issueEmailVerificationToken(user.id, user.email);

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

  async upgradeToOrganizer(userId: string) {
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

    const organizerDisplayName =
      [user.profile?.firstName, user.profile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null;

    const upgradedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(user.accountType === "ORGANIZER" ? {} : { accountType: "ORGANIZER" }),
        organizerProfile: {
          upsert: {
            create: {
              displayName: organizerDisplayName,
              onboardingStatus: organizerDisplayName
                ? AuthService.ORGANIZER_ONBOARDING_STATUS.PROFILE_INCOMPLETE
                : AuthService.ORGANIZER_ONBOARDING_STATUS.NOT_STARTED,
            },
            update: {},
          },
        },
      },
      select: this.authUserSelect(),
    });

    return this.issueToken(upgradedUser);
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted+${userId}@ticketsystem.local`,
          passwordHash: null,
          status: UserStatus.DELETED,
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      this.prisma.pushDevice.updateMany({
        where: {
          userId,
          status: PushDeviceStatus.ACTIVE,
        },
        data: {
          status: PushDeviceStatus.DISABLED,
        },
      }),
    ]);

    return {
      message: "Your account has been deleted.",
    };
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

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("This account is not active.");
    }

    if (user.emailVerifiedAt) {
      return {
        message: "Your email is already verified.",
      };
    }

    await this.issueEmailVerificationToken(user.id, user.email);

    return {
      message: "Verification email sent.",
    };
  }

  async confirmEmailVerification(token: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new BadRequestException("This verification link is invalid or has expired.");
    }

    const tokenHash = this.hashVerificationToken(normalizedToken);
    const emailVerificationToken = await (this.prisma as any).emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (
      !emailVerificationToken ||
      emailVerificationToken.usedAt ||
      emailVerificationToken.expiresAt.getTime() < Date.now() ||
      emailVerificationToken.user.status !== "ACTIVE"
    ) {
      throw new BadRequestException("This verification link is invalid or has expired.");
    }

    if (emailVerificationToken.user.emailVerifiedAt) {
      return {
        message: "Your email is already verified.",
      };
    }

    const verifiedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: emailVerificationToken.user.id },
        data: {
          emailVerifiedAt: verifiedAt,
        },
      }),
      (this.prisma as any).emailVerificationToken.update({
        where: { id: emailVerificationToken.id },
        data: {
          usedAt: verifiedAt,
        },
      }),
      (this.prisma as any).emailVerificationToken.updateMany({
        where: {
          userId: emailVerificationToken.user.id,
          usedAt: null,
          id: {
            not: emailVerificationToken.id,
          },
        },
        data: {
          usedAt: verifiedAt,
        },
      }),
    ]);

    return {
      message: "Your email has been verified successfully.",
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
      emailVerifiedAt: authUser.emailVerifiedAt,
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

  private buildEmailVerificationUrl(token: string) {
    const backendPublicUrl =
      process.env.BACKEND_PUBLIC_URL?.trim() ||
      process.env.PUBLIC_API_URL?.trim() ||
      "http://localhost:3000";
    const normalizedBaseUrl = backendPublicUrl.replace(/\/$/, "");
    const apiBaseUrl = normalizedBaseUrl.endsWith("/api")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/api`;

    return `${apiBaseUrl}/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;
  }

  private hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private hashVerificationToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueEmailVerificationToken(userId: string, email: string) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await (this.prisma as any).emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await (this.prisma as any).emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await this.sendEmailVerificationEmail({
      email,
      expiresAt,
      verificationUrl: this.buildEmailVerificationUrl(rawToken),
    });
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

  private async sendEmailVerificationEmail(input: {
    email: string;
    expiresAt: Date;
    verificationUrl: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.NOTIFICATIONS_FROM_EMAIL ?? "Ticket System <no-reply@ticketsystem.local>";
    const subject = "Verify your Maya email";
    const text = [
      "Welcome to Maya.",
      `Verify your email: ${input.verificationUrl}`,
      `This link expires at: ${input.expiresAt.toISOString()}`,
      "If you did not create this account, you can ignore this email.",
    ].join("\n");
    const html = [
      "<p>Welcome to Maya.</p>",
      `<p><a href="${input.verificationUrl}">Verify your email</a></p>`,
      `<p>This link expires at <strong>${input.expiresAt.toISOString()}</strong>.</p>`,
      "<p>If you did not create this account, you can ignore this email.</p>",
    ].join("");

    if (!resendApiKey) {
      this.logger.log(
        `Email verification preview -> to=${input.email} subject="${subject}" verificationUrl=${input.verificationUrl}`,
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
        `Email verification failed: status=${response.status} body=${body}`,
      );
      return { delivered: false, provider: "resend" as const };
    }

    return { delivered: true, provider: "resend" as const };
  }

  private authUserSelect() {
    return {
      id: true as const,
      email: true as const,
      emailVerifiedAt: true as const,
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
    emailVerifiedAt?: Date | null;
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
    const platformRoles = this.derivePlatformRoles({
      accountType: user.accountType,
      email: user.email,
      userId: user.id,
    });

    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      accountType: user.accountType,
      status: user.status,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      platformRoles,
      appRoles: this.deriveAppRoles(platformRoles, memberships),
      memberships,
    };
  }

  private derivePlatformRoles(input: {
    accountType: "ATTENDEE" | "ORGANIZER";
    email: string;
    userId: string;
  }) {
    const roles = new Set<string>();

    if (input.accountType === "ORGANIZER") {
      roles.add("EVENT_OWNER");
    }

    if (this.isPlatformAdmin(input)) {
      roles.add("PLATFORM_ADMIN");
    }

    return Array.from(roles);
  }

  private isPlatformAdmin(input: { email: string; userId: string }) {
    const adminIds = this.parsePlatformAdminList(process.env.PLATFORM_ADMIN_USER_IDS);
    const adminEmails = this.parsePlatformAdminList(process.env.PLATFORM_ADMIN_EMAILS).map(
      (value) => value.toLowerCase(),
    );

    return (
      adminIds.includes(input.userId) ||
      adminEmails.includes(input.email.trim().toLowerCase())
    );
  }

  private parsePlatformAdminList(value: string | undefined) {
    if (!value) {
      return [];
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
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
