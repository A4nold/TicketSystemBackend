import { StaffMembership, User, UserProfile } from "@prisma/client";

export type AuthenticatedUser = Pick<User, "id" | "email" | "status"> & {
  profile: Pick<UserProfile, "firstName" | "lastName"> | null;
};

export type AuthenticatedScannerMembership = Pick<
  StaffMembership,
  "id" | "eventId" | "userId" | "role" | "acceptedAt"
>;

export type AuthenticatedEventMembership = AuthenticatedScannerMembership;
