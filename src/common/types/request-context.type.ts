import { Request } from "express";

import type {
  AuthenticatedEventMembership,
  AuthenticatedScannerMembership,
  AuthenticatedUser,
} from "../../auth/types/authenticated-user.type";

export type RequestWithContext = Request & {
  requestId?: string;
  authUser?: AuthenticatedUser;
  eventMembership?: AuthenticatedEventMembership;
  scannerMembership?: AuthenticatedScannerMembership;
};
