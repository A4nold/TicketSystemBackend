import { Request } from "express";

export type RequestWithContext = Request & {
  requestId?: string;
  authUser?: {
    id: string;
    email: string;
    status: string;
    profile?: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  scannerMembership?: {
    id: string;
    eventId: string;
    userId: string;
    role: string;
  };
};
