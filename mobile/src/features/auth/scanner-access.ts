import type { AuthMembership, AuthUser } from "@/lib/auth/types";
import { getScannerAccessibleEventIds } from "@/lib/scanner/scanner-client";

export function hasScannerSurfaceAccess(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }

  return user.appRoles.includes("scanner");
}

export function getAcceptedScannerMemberships(memberships: AuthMembership[]) {
  return memberships.filter(
    (membership) =>
      Boolean(membership.acceptedAt) &&
      (membership.role === "OWNER" ||
        membership.role === "ADMIN" ||
        membership.role === "SCANNER"),
  );
}

export function canAccessScannerEvents(user: AuthUser | null | undefined) {
  if (!user || !hasScannerSurfaceAccess(user)) {
    return false;
  }

  return getScannerAccessibleEventIds(user.memberships).length > 0;
}
