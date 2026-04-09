import { describe, expect, it } from "vitest";

import { deriveAppRoles, getDefaultSurfacePath } from "@/lib/auth/role-access";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: "ATTENDEE",
    appRoles: ["attendee"],
    email: "user@example.com",
    firstName: "Test",
    id: "user_123",
    lastName: "User",
    memberships: [],
    platformRoles: [],
    status: "ACTIVE",
    ...overrides,
  };
}

function createSession(user: AuthUser): AuthSession {
  return {
    accessToken: "token",
    tokenType: "Bearer",
    user,
  };
}

describe("role access helpers", () => {
  it("derives organizer access from platform roles even when appRoles are stale", () => {
    const user = createUser({
      accountType: "ORGANIZER",
      appRoles: ["attendee"],
      platformRoles: ["EVENT_OWNER"],
    });

    expect(deriveAppRoles(user)).toEqual(["attendee", "organizer"]);
  });

  it("routes organizer-capable sessions to the organizer surface by default", () => {
    const session = createSession(
      createUser({
        accountType: "ORGANIZER",
        appRoles: ["attendee", "organizer"],
        platformRoles: ["EVENT_OWNER"],
      }),
    );

    expect(getDefaultSurfacePath(session)).toBe("/organizer");
  });
});
