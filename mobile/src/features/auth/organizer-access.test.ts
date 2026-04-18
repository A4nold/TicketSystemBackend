import { describe, expect, it } from "vitest";

import {
  canManageOrganizerEvents,
  getAcceptedOrganizerMemberships,
  hasOrganizerSurfaceAccess,
} from "@/features/auth/organizer-access";
import type { AuthMembership, AuthUser } from "@/lib/auth/types";

function buildMembership(overrides: Partial<AuthMembership> = {}): AuthMembership {
  return {
    acceptedAt:
      "acceptedAt" in overrides ? (overrides.acceptedAt ?? null) : "2026-04-01T10:00:00.000Z",
    eventId: "eventId" in overrides ? (overrides.eventId ?? "event-1") : "event-1",
    id: "id" in overrides ? (overrides.id ?? "membership-1") : "membership-1",
    role: "role" in overrides ? (overrides.role ?? "OWNER") : "OWNER",
  };
}

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: overrides.accountType ?? "ORGANIZER",
    appRoles: overrides.appRoles ?? ["organizer"],
    email: overrides.email ?? "owner@example.com",
    firstName: overrides.firstName ?? "Ada",
    id: overrides.id ?? "user-1",
    lastName: overrides.lastName ?? "Lovelace",
    memberships: overrides.memberships ?? [buildMembership()],
    platformRoles: overrides.platformRoles ?? [],
    status: overrides.status ?? "ACTIVE",
  };
}

describe("organizer-access", () => {
  it("recognizes organizer-capable users", () => {
    expect(hasOrganizerSurfaceAccess(buildUser())).toBe(true);
    expect(
      hasOrganizerSurfaceAccess(
        buildUser({
          accountType: "ATTENDEE",
          appRoles: ["attendee"],
        }),
      ),
    ).toBe(false);
  });

  it("keeps only accepted memberships", () => {
    const memberships = [
      buildMembership({ id: "accepted" }),
      buildMembership({ acceptedAt: null, id: "pending" }),
    ];

    expect(getAcceptedOrganizerMemberships(memberships).map((membership) => membership.id)).toEqual(
      ["accepted"],
    );
  });

  it("requires accepted owner or admin memberships for manageable organizer events", () => {
    expect(
      canManageOrganizerEvents(
        buildUser({
          memberships: [buildMembership({ acceptedAt: null })],
        }),
      ),
    ).toBe(false);

    expect(
      canManageOrganizerEvents(
        buildUser({
          memberships: [buildMembership({ role: "SCANNER" })],
        }),
      ),
    ).toBe(false);

    expect(
      canManageOrganizerEvents(
        buildUser({
          memberships: [buildMembership({ role: "ADMIN" })],
        }),
      ),
    ).toBe(true);
  });
});
