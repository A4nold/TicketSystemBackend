import { describe, expect, it } from "vitest";

import {
  canAccessScannerEvents,
  getAcceptedScannerMemberships,
  hasScannerSurfaceAccess,
} from "@/features/auth/scanner-access";
import type { AuthMembership, AuthUser } from "@/lib/auth/types";

function buildMembership(overrides: Partial<AuthMembership> = {}): AuthMembership {
  return {
    acceptedAt:
      "acceptedAt" in overrides ? (overrides.acceptedAt ?? null) : "2026-04-01T10:00:00.000Z",
    eventId: "eventId" in overrides ? (overrides.eventId ?? "event-1") : "event-1",
    id: "id" in overrides ? (overrides.id ?? "membership-1") : "membership-1",
    role: "role" in overrides ? (overrides.role ?? "SCANNER") : "SCANNER",
  };
}

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: overrides.accountType ?? "ATTENDEE",
    appRoles: overrides.appRoles ?? ["attendee", "scanner"],
    email: overrides.email ?? "scanner@example.com",
    firstName: overrides.firstName ?? "Tobi",
    id: overrides.id ?? "user-1",
    lastName: overrides.lastName ?? "Door",
    memberships: overrides.memberships ?? [buildMembership()],
    platformRoles: overrides.platformRoles ?? [],
    status: overrides.status ?? "ACTIVE",
  };
}

describe("scanner-access", () => {
  it("recognizes scanner-capable users", () => {
    expect(hasScannerSurfaceAccess(buildUser())).toBe(true);
    expect(hasScannerSurfaceAccess(buildUser({ appRoles: ["attendee"] }))).toBe(false);
  });

  it("keeps accepted scanner-capable memberships", () => {
    const memberships = [
      buildMembership({ id: "accepted", role: "SCANNER" }),
      buildMembership({ acceptedAt: null, id: "pending", role: "SCANNER" }),
      buildMembership({ id: "owner", role: "OWNER" }),
    ];

    expect(getAcceptedScannerMemberships(memberships).map((membership) => membership.id)).toEqual([
      "accepted",
      "owner",
    ]);
  });

  it("requires scanner surface access and accepted event memberships", () => {
    expect(canAccessScannerEvents(buildUser())).toBe(true);
    expect(canAccessScannerEvents(buildUser({ memberships: [buildMembership({ acceptedAt: null })] }))).toBe(false);
    expect(canAccessScannerEvents(buildUser({ appRoles: ["attendee"] }))).toBe(false);
  });
});
