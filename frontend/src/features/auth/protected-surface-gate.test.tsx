import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

const replace = vi.fn();
const clearNotice = vi.fn();
const useAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => useAuthMock(),
}));

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
    accessToken: "access_123",
    tokenType: "Bearer",
    user,
  };
}

describe("ProtectedSurfaceGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    useAuthMock.mockReturnValue({
      clearNotice,
      isAuthenticated: false,
      isHydrating: false,
      notice: null,
      session: null,
    });

    render(
      <ProtectedSurfaceGate
        nextPath="/organizer"
        requiredSurface="organizer"
      >
        <div>protected content</div>
      </ProtectedSurfaceGate>,
    );

    expect(screen.getByText(/redirecting to sign-in/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/auth?mode=login&next=%2Forganizer");
    });
  });

  it("shows access denied and a fallback path when the session lacks the required surface", () => {
    useAuthMock.mockReturnValue({
      clearNotice,
      isAuthenticated: true,
      isHydrating: false,
      notice: "Signed in successfully.",
      session: createSession(createUser()),
    });

    render(
      <ProtectedSurfaceGate
        nextPath="/scanner"
        requiredSurface="scanner"
      >
        <div>protected content</div>
      </ProtectedSurfaceGate>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to my surface/i })).toHaveAttribute(
      "href",
      "/wallet",
    );
  });

  it("allows organizer-capable sessions through the organizer gate", () => {
    useAuthMock.mockReturnValue({
      clearNotice,
      isAuthenticated: true,
      isHydrating: false,
      notice: null,
      session: createSession(
        createUser({
          accountType: "ORGANIZER",
          appRoles: ["attendee"],
          platformRoles: ["EVENT_OWNER"],
        }),
      ),
    });

    render(
      <ProtectedSurfaceGate
        nextPath="/organizer"
        requiredSurface="organizer"
      >
        <div>protected content</div>
      </ProtectedSurfaceGate>,
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });
});
