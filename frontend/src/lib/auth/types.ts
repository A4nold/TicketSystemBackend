export type AppSurface = "public" | "attendee" | "organizer" | "scanner";
export type AccountType = "ATTENDEE" | "ORGANIZER";
export type PlatformRole = "EVENT_OWNER";

export type AuthMembership = {
  acceptedAt: string | null;
  eventId: string;
  id: string;
  role: "OWNER" | "ADMIN" | "SCANNER";
};

export type AuthUser = {
  accountType: AccountType;
  appRoles: AppSurface[];
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
  memberships: AuthMembership[];
  platformRoles: PlatformRole[];
  status: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};
