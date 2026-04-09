import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { getCurrentAttendee } from "@/lib/auth/auth-client";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

vi.mock("@/lib/auth/auth-client", () => ({
  getCurrentAttendee: vi.fn(),
}));

const SESSION_STORAGE_KEY = "ticketsystem.attendee.session";

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
    accessToken: "token_123",
    tokenType: "Bearer",
    user,
  };
}

function AuthSnapshot() {
  const { isHydrating, session, setSession } = useAuth();

  return (
    <div>
      <p data-testid="hydrating">{String(isHydrating)}</p>
      <p data-testid="accountType">{session?.user.accountType ?? "none"}</p>
      <p data-testid="roles">{session?.user.appRoles.join(",") ?? "none"}</p>
      <button
        type="button"
        onClick={() =>
          setSession(
            createSession(
              createUser({
                accountType: "ATTENDEE",
                appRoles: ["attendee"],
                platformRoles: ["EVENT_OWNER"],
              }),
            ),
          )
        }
      >
        seed organizer session
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("normalizes organizer capability when persisting a session", async () => {
    render(
      <AuthProvider>
        <AuthSnapshot />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrating")).toHaveTextContent("false");
    });

    await userEvent.click(screen.getByRole("button", { name: /seed organizer session/i }));

    expect(screen.getByTestId("accountType")).toHaveTextContent("ORGANIZER");
    expect(screen.getByTestId("roles")).toHaveTextContent("attendee,organizer");

    const stored = JSON.parse(
      window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null",
    ) as AuthSession | null;

    expect(stored?.user.accountType).toBe("ORGANIZER");
    expect(stored?.user.appRoles).toEqual(["attendee", "organizer"]);
  });

  it("hydrates an older stored session into organizer-capable state", async () => {
    const storedSession = createSession(
      createUser({
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        platformRoles: [],
      }),
    );

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));

    vi.mocked(getCurrentAttendee).mockResolvedValue(
      createUser({
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        platformRoles: ["EVENT_OWNER"],
      }),
    );

    render(
      <AuthProvider>
        <AuthSnapshot />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrating")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("accountType")).toHaveTextContent("ORGANIZER");
    expect(screen.getByTestId("roles")).toHaveTextContent("attendee,organizer");
    expect(getCurrentAttendee).toHaveBeenCalledWith("token_123");
  });
});
