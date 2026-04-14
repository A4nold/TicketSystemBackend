import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OwnedTicketDetail } from "@/features/tickets/owned-ticket-detail";
import { getOwnedTicketBySerialNumber } from "@/lib/tickets/tickets-client";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    session: {
      accessToken: "access_123",
      tokenType: "Bearer",
      user: {
        accountType: "ATTENDEE",
        appRoles: ["attendee"],
        email: "ada@student.ie",
        firstName: "Ada",
        id: "user_1",
        lastName: "Student",
        memberships: [],
        platformRoles: [],
        status: "ACTIVE",
      },
    },
  }),
}));

vi.mock("@/features/auth/protected-surface-gate", () => ({
  ProtectedSurfaceGate: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/tickets/ticket-qr-panel", () => ({
  TicketQrPanel: () => <div>QR Panel</div>,
}));

vi.mock("@/features/tickets/ticket-transfer-panel", () => ({
  TicketTransferPanel: () => <div>Transfer Panel</div>,
}));

vi.mock("@/features/tickets/ticket-resale-panel", () => ({
  TicketResalePanel: () => <div>Resale Panel</div>,
}));

vi.mock("@/lib/tickets/tickets-client", () => ({
  getOwnedTicketBySerialNumber: vi.fn(),
}));

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OwnedTicketDetail serialNumber="CNT-GA-0001" />
    </QueryClientProvider>,
  );
}

function buildTicketDetail(overrides: Partial<Awaited<ReturnType<typeof getOwnedTicketBySerialNumber>>> = {}) {
  return {
    cancelledAt: null,
    currentOwner: {
      email: "ada@student.ie",
      firstName: "Ada",
      id: "user_1",
      lastName: "Student",
    },
    event: {
      id: "event_1",
      postEventContent: null,
      resalePolicy: {
        endsAt: null,
        maxResalePrice: null,
        minResalePrice: null,
        resaleRoyaltyPercent: null,
        startsAt: null,
      },
      slug: "campus-neon-takeover",
      startsAt: "2026-05-01T21:00:00.000Z",
      status: "PUBLISHED",
      title: "Campus Neon Takeover",
    },
    id: "ticket_1",
    issuedAt: "2026-04-20T21:00:00.000Z",
    latestResaleListing: null,
    latestTransfer: null,
    ownershipHistory: [],
    ownershipRevision: 1,
    qrTokenId: "qr_active_123",
    refundedAt: null,
    reservedUntil: null,
    scanAttempts: [],
    scanSummary: {
      lastScannedAt: null,
      latestOutcome: null,
      totalAttempts: 0,
    },
    serialNumber: "CNT-GA-0001",
    status: "ISSUED",
    ticketType: {
      currency: "EUR",
      id: "ticket_type_1",
      name: "General Admission",
      price: "25.00",
    },
    usedAt: null,
    ...overrides,
  };
}

describe("OwnedTicketDetail transfer state messaging", () => {
  it("explains that ownership stayed with the attendee after an expired transfer", async () => {
    vi.mocked(getOwnedTicketBySerialNumber).mockResolvedValue(
      buildTicketDetail({
        latestTransfer: {
          acceptedAt: null,
          cancelledAt: null,
          expiresAt: "2026-04-26T19:00:00.000Z",
          id: "transfer_1",
          reminderSentAt: null,
          recipientEmail: "tobi@student.ie",
          senderUserId: "user_1",
          status: "EXPIRED",
        },
      }) as never,
    );

    renderDetail();

    expect(
      await screen.findByText(/transfer expired and ownership stayed with you/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/the transfer expired before acceptance was completed/i),
    ).toBeInTheDocument();
  });

  it("explains that ownership stayed with the attendee after a cancelled transfer", async () => {
    vi.mocked(getOwnedTicketBySerialNumber).mockResolvedValue(
      buildTicketDetail({
        latestTransfer: {
          acceptedAt: null,
          cancelledAt: "2026-04-26T18:00:00.000Z",
          expiresAt: "2026-04-26T19:00:00.000Z",
          id: "transfer_1",
          reminderSentAt: null,
          recipientEmail: "tobi@student.ie",
          senderUserId: "user_1",
          status: "CANCELLED",
        },
      }) as never,
    );

    renderDetail();

    expect(
      await screen.findByText(/transfer was cancelled and ownership stayed with you/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/the transfer was cancelled before ownership changed/i),
    ).toBeInTheDocument();
  });

  it("shows post-event content once it is available for the ticket", async () => {
    vi.mocked(getOwnedTicketBySerialNumber).mockResolvedValue(
      buildTicketDetail({
        event: {
          id: "event_1",
          postEventContent: {
            ctaLabel: "View replay",
            ctaUrl: "https://example.com/replay",
            message: "Thanks for coming back to the wallet.",
            publishedAt: "2026-05-02T10:00:00.000Z",
          },
          resalePolicy: {
            endsAt: null,
            maxResalePrice: null,
            minResalePrice: null,
            resaleRoyaltyPercent: null,
            startsAt: null,
          },
          slug: "campus-neon-takeover",
          startsAt: "2026-05-01T21:00:00.000Z",
          status: "COMPLETED",
          title: "Campus Neon Takeover",
        },
      }) as never,
    );

    renderDetail();

    expect(
      await screen.findByText(/this ticket still carries value after the event/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/thanks for coming back to the wallet/i),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /view replay/i })).toBeInTheDocument();
  });
});
