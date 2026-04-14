import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WalletActivityPanel } from "@/features/tickets/wallet-activity-panel";
import { listWalletNotifications } from "@/lib/notifications/notifications-client";
import { listIncomingTransfers } from "@/lib/transfers/transfers-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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

vi.mock("@/lib/notifications/notifications-client", () => ({
  listWalletNotifications: vi.fn(),
  markWalletNotificationAsRead: vi.fn(),
}));

vi.mock("@/lib/transfers/transfers-client", () => ({
  listIncomingTransfers: vi.fn(),
}));

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
      <WalletActivityPanel
        recentOrderId="order_123"
        tickets={[
          {
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
            issuedAt: "2026-04-20T20:00:00.000Z",
            ownershipRevision: 1,
            qrTokenId: "qr_token_1",
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
          },
        ]}
      />
    </QueryClientProvider>,
  );
}

describe("WalletActivityPanel", () => {
  it("surfaces pending actions from transfers and unread notifications together", async () => {
    vi.mocked(listWalletNotifications).mockResolvedValue([
      {
        actionUrl: "/wallet/CNT-GA-0001",
        body: "Your transfer is pending acceptance.",
        createdAt: "2026-04-25T19:00:00.000Z",
        id: "notification_1",
        metadata: { serialNumber: "CNT-GA-0001" },
        readAt: null,
        status: "UNREAD",
        title: "Transfer started",
        type: "TRANSFER_CREATED",
      },
    ]);
    vi.mocked(listIncomingTransfers).mockResolvedValue([
      {
        event: {
          id: "event_2",
          slug: "vip-afterparty",
          startsAt: "2026-05-03T22:00:00.000Z",
          title: "VIP Afterparty",
        },
        expiresAt: "2026-05-02T10:00:00.000Z",
        id: "transfer_1",
        message: null,
        senderEmail: "tobi@student.ie",
        senderUserId: "user_2",
        serialNumber: "VIP-0001",
        status: "PENDING",
        ticketType: {
          id: "ticket_type_2",
          name: "VIP",
        },
      },
    ]);

    renderPanel();

    expect(
      await screen.findByText(/what needs your attention next/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/2 active items/i)).toBeInTheDocument();
    expect(await screen.findByText(/vip afterparty/i)).toBeInTheDocument();
    expect(await screen.findByText(/transfer started/i)).toBeInTheDocument();
  });

  it("surfaces post-event content for completed tickets without cluttering upcoming flows", async () => {
    vi.mocked(listWalletNotifications).mockResolvedValue([]);
    vi.mocked(listIncomingTransfers).mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WalletActivityPanel
          tickets={[
            {
              currentOwner: {
                email: "ada@student.ie",
                firstName: "Ada",
                id: "user_1",
                lastName: "Student",
              },
              event: {
                id: "event_1",
                postEventContent: {
                  ctaLabel: "View replay",
                  ctaUrl: "https://example.com/replay",
                  message: "Replay moments are now live.",
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
              id: "ticket_1",
              issuedAt: "2026-04-20T20:00:00.000Z",
              ownershipRevision: 1,
              qrTokenId: "qr_token_1",
              scanSummary: {
                lastScannedAt: null,
                latestOutcome: null,
                totalAttempts: 0,
              },
              serialNumber: "CNT-GA-0001",
              status: "USED",
              ticketType: {
                currency: "EUR",
                id: "ticket_type_1",
                name: "General Admission",
                price: "25.00",
              },
              usedAt: "2026-05-01T21:30:00.000Z",
            },
          ]}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/fresh post-event content from organizers/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/replay moments are now live/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /view replay/i })).toBeInTheDocument();
  });
});
