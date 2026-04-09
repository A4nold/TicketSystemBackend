import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventManagementPanel } from "@/features/organizer/event-management-panel";
import type { AuthSession, AuthUser } from "@/lib/auth/types";
import {
  getOrganizerEventBySlug,
  inviteOrganizerStaff,
  listOrganizerEvents,
  listOrganizerStaff,
} from "@/lib/organizer/events-client";

const useAuthMock = vi.fn();

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/features/operations/ticket-issue-visibility-panel", () => ({
  TicketIssueVisibilityPanel: () => <div>ticket issue panel</div>,
}));

vi.mock("@/lib/organizer/events-client", async () => {
  const actual = await vi.importActual("@/lib/organizer/events-client");

  return {
    ...actual,
    createOrganizerTicketType: vi.fn(),
    getOrganizerEventBySlug: vi.fn(),
    inviteOrganizerStaff: vi.fn(),
    listOrganizerEvents: vi.fn(),
    listOrganizerStaff: vi.fn(),
    revokeOrganizerStaff: vi.fn(),
    updateOrganizerEvent: vi.fn(),
    updateOrganizerStaffRole: vi.fn(),
    updateOrganizerTicketType: vi.fn(),
  };
});

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: "ORGANIZER",
    appRoles: ["attendee", "organizer"],
    email: "organizer@example.com",
    firstName: "Org",
    id: "user_123",
    lastName: "Owner",
    memberships: [
      {
        acceptedAt: "2026-04-10T12:00:00.000Z",
        eventId: "event_1",
        id: "membership_1",
        role: "ADMIN",
      },
    ],
    platformRoles: ["EVENT_OWNER"],
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

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EventManagementPanel />
    </QueryClientProvider>,
  );
}

describe("EventManagementPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the bootstrap empty state when the organizer has no manageable events", async () => {
    useAuthMock.mockReturnValue({
      session: createSession(
        createUser({
          memberships: [],
        }),
      ),
    });

    vi.mocked(listOrganizerEvents).mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByText(/no organizer-owned events yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/create your first event above/i),
    ).toBeInTheDocument();
  });

  it("invites staff from the organizer management surface and shows success feedback", async () => {
    useAuthMock.mockReturnValue({
      session: createSession(createUser()),
    });

    vi.mocked(listOrganizerEvents).mockResolvedValue([
      {
        allowResale: false,
        coverImageUrl: null,
        description: "Managed event",
        endsAt: null,
        id: "event_1",
        issuedTicketsCount: 0,
        organizer: {
          email: "organizer@example.com",
          firstName: "Org",
          id: "user_123",
          lastName: "Owner",
        },
        resaleWindow: {
          endsAt: null,
          maxResalePrice: null,
          startsAt: null,
        },
        slug: "managed-event",
        startsAt: "2026-05-01T21:00:00.000Z",
        status: "DRAFT",
        ticketTypes: [],
        timezone: "Europe/Dublin",
        title: "Managed Event",
        venueAddress: null,
        venueName: "Main Hall",
      },
    ]);

    vi.mocked(getOrganizerEventBySlug).mockResolvedValue({
      allowResale: false,
      coverImageUrl: null,
      description: "Managed event",
      endsAt: null,
      id: "event_1",
      issuedTicketsCount: 0,
      metrics: {
        resaleListings: 0,
        scanAttempts: 0,
        tickets: 0,
      },
      organizer: {
        email: "organizer@example.com",
        firstName: "Org",
        id: "user_123",
        lastName: "Owner",
      },
      resalePolicy: {
        endsAt: null,
        maxResalePrice: null,
        startsAt: null,
      },
      salesWindow: {
        endsAt: null,
        startsAt: null,
      },
      slug: "managed-event",
      staff: [],
      startsAt: "2026-05-01T21:00:00.000Z",
      status: "DRAFT",
      ticketTypes: [],
      timezone: "Europe/Dublin",
      title: "Managed Event",
      venueAddress: null,
      venueName: "Main Hall",
    });

    vi.mocked(listOrganizerStaff).mockResolvedValue([
      {
        acceptedAt: "2026-04-10T12:00:00.000Z",
        id: "membership_1",
        invitedAt: "2026-04-10T11:00:00.000Z",
        role: "OWNER",
        user: {
          email: "organizer@example.com",
          firstName: "Org",
          id: "user_123",
          lastName: "Owner",
        },
      },
    ]);

    vi.mocked(inviteOrganizerStaff).mockResolvedValue({
      acceptedAt: null,
      id: "membership_2",
      invitedAt: "2026-04-10T13:00:00.000Z",
      role: "SCANNER",
      user: {
        email: "scanner.new@example.com",
        firstName: null,
        id: "user_456",
        lastName: null,
      },
    });

    renderPanel();

    expect(await screen.findByText(/edit event setup and ticket types/i)).toBeInTheDocument();
    expect(await screen.findByText(/staff access/i)).toBeInTheDocument();

    const inviteEmailInput = document.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement | null;

    expect(inviteEmailInput).not.toBeNull();

    await userEvent.type(inviteEmailInput!, "scanner.new@example.com");
    await userEvent.click(screen.getByRole("button", { name: /invite staff/i }));

    await waitFor(() => {
      expect(inviteOrganizerStaff).toHaveBeenCalledWith(
        "event_1",
        {
          email: "scanner.new@example.com",
          role: "SCANNER",
        },
        "access_123",
      );
    });

    expect(await screen.findByText(/staff invite sent\./i)).toBeInTheDocument();
  });
});
