import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { resolveRequiredSecret } from "../common/env-security";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EventMembershipGuard } from "./guards/event-membership.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: resolveRequiredSecret(
          "JWT_SECRET",
          "dev-insecure-jwt-secret-change-me",
        ),
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, EventMembershipGuard],
  exports: [AuthService, JwtAuthGuard, EventMembershipGuard],
})
export class AuthModule {}
