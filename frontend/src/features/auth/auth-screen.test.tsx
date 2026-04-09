import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthScreen } from "@/features/auth/auth-screen";
import {
  getCurrentAttendee,
  registerAttendee,
} from "@/lib/auth/auth-client";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

const push = vi.fn();
const setSession = vi.fn();
const clearNotice = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    clearNotice,
    notice: null,
    session: null,
    setSession,
  }),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  getCurrentAttendee: vi.fn(),
  loginAttendee: vi.fn(),
  registerAttendee: vi.fn(),
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

describe("AuthScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers an organizer account and routes into the organizer surface", async () => {
    const hydratedUser = createUser({
      accountType: "ORGANIZER",
      appRoles: ["attendee", "organizer"],
      email: "organizer.new@example.com",
      platformRoles: ["EVENT_OWNER"],
    });
    const response = createSession(
      createUser({
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "organizer.new@example.com",
      }),
    );

    vi.mocked(registerAttendee).mockResolvedValue(response);
    vi.mocked(getCurrentAttendee).mockResolvedValue(hydratedUser);

    render(
      <AuthScreen
        defaultMode="register"
        nextPath="/organizer"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /organizer create your first event immediately/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /^email$/i }),
      "organizer.new@example.com",
    );
    const passwordInput = document.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement | null;

    expect(passwordInput).not.toBeNull();
    await userEvent.type(passwordInput!, "Passw0rd!");

    await userEvent.click(
      screen.getByRole("button", { name: /create organizer account/i }),
    );

    await waitFor(() => {
      expect(registerAttendee).toHaveBeenCalledWith({
        accountType: "ORGANIZER",
        email: "organizer.new@example.com",
        firstName: undefined,
        lastName: undefined,
        password: "Passw0rd!",
        phoneNumber: undefined,
      });
    });

    expect(getCurrentAttendee).toHaveBeenCalledWith("access_123");

    await waitFor(() => {
      expect(setSession).toHaveBeenCalledWith({
        ...response,
        user: hydratedUser,
      });
      expect(push).toHaveBeenCalledWith("/organizer");
    });
  });
});
