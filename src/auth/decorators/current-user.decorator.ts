import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import {
  AuthenticatedEventMembership,
  AuthenticatedScannerMembership,
  AuthenticatedUser,
} from "../types/authenticated-user.type";

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
  eventMembership?: AuthenticatedEventMembership;
  scannerMembership?: AuthenticatedScannerMembership;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser;
  },
);

export const CurrentEventMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedEventMembership | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.eventMembership;
  },
);

export const CurrentScannerMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedScannerMembership | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.scannerMembership ?? request.eventMembership;
  },
);
