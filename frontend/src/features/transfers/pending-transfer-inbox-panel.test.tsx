import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PendingTransferInboxPanel } from "@/features/transfers/pending-transfer-inbox-panel";
import type { AuthSession, AuthUser } from "@/lib/auth/types";
import {
  acceptTransfer,
  listIncomingTransfers,
} from "@/lib/transfers/transfers-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    session: createSession(createUser()),
  }),
}));

vi.mock("@/lib/transfers/transfers-client", () => ({
  acceptTransfer: vi.fn(),
  listIncomingTransfers: vi.fn(),
}));

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: "ATTENDEE",
    appRoles: ["attendee"],
    email: "organizer@campusnight.ie",
    firstName: "Organizer",
    id: "user_organizer",
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
      <PendingTransferInboxPanel />
    </QueryClientProvider>,
  );
}

describe("PendingTransferInboxPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders incoming transfers returned by the inbox API", async () => {
    vi.mocked(listIncomingTransfers).mockResolvedValue([
      {
        event: {
          id: "event_1",
          slug: "campus-neon-takeover",
          startsAt: "2026-05-01T21:00:00.000Z",
          title: "Campus Neon Takeover",
        },
        expiresAt: "2026-05-02T21:00:00.000Z",
        id: "transfer_1",
        message: "Enjoy the event",
        senderEmail: "ada@student.ie",
        senderUserId: "user_ada",
        serialNumber: "CNT-GA-0001",
        status: "PENDING",
        ticketType: {
          id: "ticket_type_1",
          name: "General Admission",
        },
      },
    ]);

    renderPanel();

    expect(
      await screen.findByText(/tickets are waiting for your review/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/campus neon takeover/i)).toBeInTheDocument();
    expect(await screen.findByText(/from: ada@student.ie/i)).toBeInTheDocument();
  });

  it("accepts a transfer from the inbox and routes into wallet detail", async () => {
    vi.mocked(listIncomingTransfers).mockResolvedValue([
      {
        event: {
          id: "event_1",
          slug: "campus-neon-takeover",
          startsAt: "2026-05-01T21:00:00.000Z",
          title: "Campus Neon Takeover",
        },
        expiresAt: "2026-05-02T21:00:00.000Z",
        id: "transfer_1",
        message: null,
        senderEmail: "ada@student.ie",
        senderUserId: "user_ada",
        serialNumber: "CNT-GA-0001",
        status: "PENDING",
        ticketType: {
          id: "ticket_type_1",
          name: "General Admission",
        },
      },
    ]);

    vi.mocked(acceptTransfer).mockResolvedValue({
      acceptedAt: "2026-05-01T12:00:00.000Z",
      cancelledAt: null,
      expiresAt: "2026-05-02T21:00:00.000Z",
      id: "transfer_1",
      message: null,
      ownershipRevision: 2,
      recipientEmail: "organizer@campusnight.ie",
      recipientUserId: "user_organizer",
      senderUserId: "user_ada",
      serialNumber: "CNT-GA-0001",
      status: "ACCEPTED",
      ticketId: "ticket_1",
      ticketStatus: "ISSUED",
      transferToken: "token_1",
    });

    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: /accept now/i }));

    await waitFor(() => {
      expect(acceptTransfer).toHaveBeenCalledWith("CNT-GA-0001", "access_123");
      expect(push).toHaveBeenCalledWith("/wallet/CNT-GA-0001");
    });
  });
});
