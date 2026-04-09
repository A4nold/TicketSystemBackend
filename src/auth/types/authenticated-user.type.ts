import { StaffMembership, User, UserProfile } from "@prisma/client";

type AuthenticatedPlatformRole = "EVENT_OWNER";
type AuthenticatedAccountType = "ATTENDEE" | "ORGANIZER";

export type AuthenticatedUser = Pick<User, "id" | "email" | "status"> & {
  accountType: AuthenticatedAccountType;
  appRoles: string[];
  memberships: AuthenticatedEventMembership[];
  platformRoles: AuthenticatedPlatformRole[];
  profile: Pick<UserProfile, "firstName" | "lastName"> | null;
};

export type AuthenticatedScannerMembership = Pick<
  StaffMembership,
  "id" | "eventId" | "userId" | "role" | "acceptedAt"
>;

export type AuthenticatedEventMembership = AuthenticatedScannerMembership;
