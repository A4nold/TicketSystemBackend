import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScannerWorkspace } from "@/features/scanner/scanner-workspace";
import type { AuthSession, AuthUser } from "@/lib/auth/types";
import {
  getScannerManifest,
  listScannerEvents,
  syncScannerAttempts,
} from "@/lib/scanner/scanner-client";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    session: createSession(
      createUser({
        memberships: [
          {
            acceptedAt: "2026-04-10T12:00:00.000Z",
            eventId: "event_1",
            id: "membership_1",
            role: "SCANNER",
          },
        ],
      }),
    ),
  }),
}));

vi.mock("@/features/operations/ticket-issue-visibility-panel", () => ({
  TicketIssueVisibilityPanel: () => <div>ticket issue panel</div>,
}));

vi.mock("@/lib/scanner/scanner-client", () => ({
  getScannerAccessibleEventIds: (memberships: Array<{ acceptedAt: string | null; eventId: string; role: string }>) =>
    memberships
      .filter(
        (membership) =>
          membership.acceptedAt &&
          ["OWNER", "ADMIN", "SCANNER"].includes(membership.role),
      )
      .map((membership) => membership.eventId),
  getScannerManifest: vi.fn(),
  listScannerEvents: vi.fn(),
  syncScannerAttempts: vi.fn(),
  validateScannerTicket: vi.fn(),
}));

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: "ATTENDEE",
    appRoles: ["attendee", "scanner"],
    email: "scanner@example.com",
    firstName: "Scan",
    id: "user_123",
    lastName: "Staff",
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

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ScannerWorkspace />
    </QueryClientProvider>,
  );
}

describe("ScannerWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });

    vi.mocked(listScannerEvents).mockResolvedValue([
      {
        description: "Door testing event",
        id: "event_1",
        startsAt: "2026-05-01T21:00:00.000Z",
        status: "PUBLISHED",
        ticketTypes: [{ id: "ticket_type_1", name: "General Admission" }],
        title: "Campus Neon Takeover",
        venueName: "Main Hall",
      },
    ]);

    vi.mocked(getScannerManifest).mockResolvedValue({
      eventTitle: "Campus Neon Takeover",
      generatedAt: "2026-05-01T20:00:00.000Z",
      manifestVersion: 4,
      tickets: [
        {
          ownershipRevision: 1,
          qrTokenId: "qr_seed_ga_0001",
          serialNumber: "CNT-GA-0001",
          status: "ISSUED",
        },
      ],
    });

    vi.mocked(syncScannerAttempts).mockResolvedValue({
      acceptedCount: 1,
      scanSessionId: "scan_session_2",
    });
  });

  it("queues a degraded attempt from the manifest and syncs it after recovery", async () => {
    renderWorkspace();

    expect(await screen.findByText(/manifest v4 is loaded/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /simulate degraded mode/i }));
    await userEvent.click(screen.getByRole("button", { name: /cnt-ga-0001/i }));
    await userEvent.click(screen.getByRole("button", { name: /queue degraded attempt/i }));

    expect(await screen.findByText(/limited-confidence ready signal/i)).toBeInTheDocument();
    expect(screen.getByText(/queue and resync safely/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /return to live mode/i }));
    await userEvent.click(screen.getByRole("button", { name: /sync queued attempts/i }));

    await waitFor(() => {
      expect(syncScannerAttempts).toHaveBeenCalledWith(
        "event_1",
        expect.objectContaining({
          attempts: [
            expect.objectContaining({
              outcome: "VALID",
              qrTokenId: "qr_seed_ga_0001",
              reasonCode: "degraded_manifest_ready",
            }),
          ],
          mode: "OFFLINE_SYNC",
        }),
        "access_123",
      );
    });

    expect(
      await screen.findByText(/1 degraded attempt synced back to the event session/i),
    ).toBeInTheDocument();
  });
});
