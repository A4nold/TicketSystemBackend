import { Body, Controller, Delete, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthResponseDto, AuthUserResponseDto } from "./dto/auth-response.dto";
import {
  EmailVerificationResponseDto,
  VerifyEmailConfirmDto,
} from "./dto/email-verification.dto";
import { LoginDto } from "./dto/login.dto";
import {
  ForgotPasswordDto,
  PasswordResetResponseDto,
  ResetPasswordDto,
} from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthenticatedUser } from "./types/authenticated-user.type";
import { AuthService } from "./auth.service";
import { RateLimit } from "../common/security/rate-limit.decorator";
import { Response } from "express";
import { randomBytes } from "crypto";

const ACCESS_COOKIE_NAME = "ts_access_token";
const CSRF_COOKIE_NAME = "ts_csrf_token";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({
    summary: "Register a new user account",
  })
  @ApiCreatedResponse({
    description: "User registered and authenticated",
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: "The registration payload is invalid or the email already exists",
  })
  @RateLimit({
    keyPrefix: "auth:register",
    maxRequests: 10,
    windowMs: 60_000,
  })
  async register(
    @Body() payload: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.register(payload);
    this.setAccessCookie(response, authResponse.accessToken);
    return authResponse;
  }

  @Post("login")
  @ApiOperation({
    summary: "Log in with email and password",
  })
  @ApiOkResponse({
    description: "Authenticated user and access token",
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Email/password was invalid or the account is inactive",
  })
  @RateLimit({
    keyPrefix: "auth:login",
    maxRequests: 10,
    windowMs: 60_000,
  })
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.login(payload);
    this.setAccessCookie(response, authResponse.accessToken);
    return authResponse;
  }

  @Post("forgot-password")
  @ApiOperation({
    summary: "Request a password reset link",
  })
  @ApiOkResponse({
    description: "Password reset request accepted",
    type: PasswordResetResponseDto,
  })
  @RateLimit({
    keyPrefix: "auth:forgot-password",
    maxRequests: 5,
    windowMs: 60_000,
  })
  forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(payload);
  }

  @Post("verify-email/request")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Send or resend the current user's email verification link",
  })
  @ApiOkResponse({
    description: "Verification email request accepted",
    type: EmailVerificationResponseDto,
  })
  requestEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Post("verify-email/confirm")
  @ApiOperation({
    summary: "Confirm email ownership using a verification token",
  })
  @ApiOkResponse({
    description: "Email verified successfully",
    type: EmailVerificationResponseDto,
  })
  confirmEmailVerification(@Body() payload: VerifyEmailConfirmDto) {
    return this.authService.confirmEmailVerification(payload.token);
  }

  @Get("verify-email/confirm")
  @ApiOperation({
    summary: "Confirm email ownership from a browser-based verification link",
  })
  async confirmEmailVerificationFromLink(
    @Query("token") token: string,
    @Res() response: Response,
  ) {
    try {
      const result = await this.authService.confirmEmailVerification(token);
      response
        .status(200)
        .type("html")
        .send(
          `<html><body style="font-family: sans-serif; padding: 32px;"><h1>Email verified</h1><p>${result.message}</p><p>You can return to Maya and refresh your organizer setup.</p></body></html>`,
        );
    } catch (error) {
      response
        .status(400)
        .type("html")
        .send(
          `<html><body style="font-family: sans-serif; padding: 32px;"><h1>Verification failed</h1><p>${error instanceof Error ? error.message : "This verification link is invalid or expired."}</p></body></html>`,
        );
    }
  }

  @Post("reset-password")
  @ApiOperation({
    summary: "Reset password using a valid reset token",
  })
  @ApiOkResponse({
    description: "Password has been reset successfully",
    type: PasswordResetResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Reset token is invalid, expired, or the new password is invalid",
  })
  @RateLimit({
    keyPrefix: "auth:reset-password",
    maxRequests: 10,
    windowMs: 60_000,
  })
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }

  @Get("me")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get the current authenticated user",
  })
  @ApiOkResponse({
    description: "Authenticated user profile",
    type: AuthUserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Delete("me")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete the current authenticated user account",
  })
  @ApiOkResponse({
    description: "Authenticated user account deleted",
    type: PasswordResetResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.deleteAccount(user.id);
    response.clearCookie(ACCESS_COOKIE_NAME, this.getCookieOptions());
    response.clearCookie(CSRF_COOKIE_NAME, this.getCookieOptions());
    return result;
  }

  @Post("upgrade-to-organizer")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Upgrade the current authenticated account to organizer access",
  })
  @ApiOkResponse({
    description: "Authenticated user upgraded to organizer capability",
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Bearer token was missing, invalid, expired, or tied to an inactive user",
  })
  async upgradeToOrganizer(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.upgradeToOrganizer(user.id);
    this.setAccessCookie(response, authResponse.accessToken);
    return authResponse;
  }

  @Post("logout")
  @ApiOperation({
    summary: "Log out the current browser session",
  })
  @ApiOkResponse({
    description: "Auth cookie cleared",
    type: PasswordResetResponseDto,
  })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_COOKIE_NAME, this.getCookieOptions());
    response.clearCookie(CSRF_COOKIE_NAME, this.getCookieOptions());
    return {
      message: "You have been logged out.",
    };
  }

  private setAccessCookie(response: Response, accessToken: string) {
    const csrfToken = randomBytes(24).toString("hex");

    response.cookie(ACCESS_COOKIE_NAME, accessToken, {
      ...this.getCookieOptions(),
      maxAge: this.resolveCookieMaxAgeMs(),
    });
    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...this.getCookieOptions(),
      httpOnly: false,
      maxAge: this.resolveCookieMaxAgeMs(),
    });
  }

  private getCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      httpOnly: true,
      path: "/",
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      secure: isProduction,
    };
  }

  private resolveCookieMaxAgeMs() {
    const fallbackMs = 24 * 60 * 60 * 1000;
    const raw = process.env.JWT_COOKIE_MAX_AGE_MS?.trim();

    if (!raw) {
      return fallbackMs;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
  }
}
