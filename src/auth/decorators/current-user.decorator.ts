import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AuthenticatedScannerMembership, AuthenticatedUser } from "../types/authenticated-user.type";

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
  scannerMembership?: AuthenticatedScannerMembership;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser;
  },
);

export const CurrentScannerMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedScannerMembership | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.scannerMembership;
  },
);
