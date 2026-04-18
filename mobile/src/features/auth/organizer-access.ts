import type { AuthMembership, AuthUser } from "@/lib/auth/types";
import { getOrganizerManageableEventIds } from "@/lib/organizer/events-client";

export function hasOrganizerSurfaceAccess(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }

  return user.accountType === "ORGANIZER" || user.appRoles.includes("organizer");
}

export function getAcceptedOrganizerMemberships(memberships: AuthMembership[]) {
  return memberships.filter((membership) => Boolean(membership.acceptedAt));
}

export function canManageOrganizerEvents(user: AuthUser | null | undefined) {
  if (!user || !hasOrganizerSurfaceAccess(user)) {
    return false;
  }

  return getOrganizerManageableEventIds(user.memberships).length > 0;
}
