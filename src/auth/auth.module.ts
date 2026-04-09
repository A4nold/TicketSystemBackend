import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EventMembershipGuard } from "./guards/event-membership.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET must be defined before starting the API.");
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as never,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, EventMembershipGuard],
  exports: [AuthService, JwtAuthGuard, EventMembershipGuard],
})
export class AuthModule {}
