import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
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
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
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
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post("forgot-password")
  @ApiOperation({
    summary: "Request a password reset link",
  })
  @ApiOkResponse({
    description: "Password reset request accepted",
    type: PasswordResetResponseDto,
  })
  forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(payload);
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
}
