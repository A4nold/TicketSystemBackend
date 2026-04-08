export type AppSurface = "public" | "attendee" | "organizer" | "scanner";

export type AuthUser = {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
  status: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};

export type AuthSession = {
  accessToken: string;
  appRoles: AppSurface[];
  tokenType: string;
  user: AuthUser;
};
