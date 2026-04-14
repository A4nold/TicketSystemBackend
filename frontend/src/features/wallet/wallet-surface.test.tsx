import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WalletSurface } from "@/features/wallet/wallet-surface";

const push = vi.fn();
const signOut = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    clearNotice: vi.fn(),
    notice: "Wallet refreshed",
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
    signOut,
  }),
}));

vi.mock("@/features/wallet/wallet-hero-panel", () => ({
  WalletHeroPanel: () => <div>Wallet Hero</div>,
}));

vi.mock("@/features/staff/pending-staff-invites-panel", () => ({
  PendingStaffInvitesPanel: () => <div>Pending Staff Invites</div>,
}));

vi.mock("@/features/checkout/recent-order-panel", () => ({
  RecentOrderPanel: ({ orderId }: { orderId: string }) => <div>Recent Order {orderId}</div>,
}));

vi.mock("@/features/transfers/pending-transfer-inbox-panel", () => ({
  PendingTransferInboxPanel: () => <div>Transfer Inbox</div>,
}));

vi.mock("@/features/wallet/wallet-account-panel", () => ({
  WalletAccountPanel: ({
    onSignOut,
  }: {
    onSignOut: () => void;
  }) => <button onClick={onSignOut}>Sign out now</button>,
}));

vi.mock("@/features/tickets/wallet-activity-panel", () => ({
  WalletActivityPanel: ({
    tickets,
  }: {
    tickets: Array<{ serialNumber: string }>;
  }) => <div>Wallet Activity Count {tickets.length}</div>,
}));

vi.mock("@/features/tickets/owned-ticket-list", () => ({
  OwnedTicketList: ({
    onTicketsLoaded,
  }: {
    onTicketsLoaded?: (tickets: Array<{ serialNumber: string }>) => void;
  }) => {
    useEffect(() => {
      onTicketsLoaded?.([
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
            resalePolicy: null,
            slug: "campus-neon-takeover",
            startsAt: "2026-05-01T21:00:00.000Z",
            status: "PUBLISHED",
            title: "Campus Neon Takeover",
          },
          id: "ticket_1",
          issuedAt: "2026-04-20T20:00:00.000Z",
          ownershipRevision: 1,
          qrTokenId: "qr_1",
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
      ]);
    }, [onTicketsLoaded]);

    return <div>Owned Ticket List</div>;
  },
}));

describe("WalletSurface", () => {
  it("renders wallet sections and forwards loaded tickets into wallet activity", async () => {
    render(<WalletSurface eventSlug="campus-neon-takeover" recentOrderId="order_123" />);

    expect(screen.getByText("Wallet Hero")).toBeInTheDocument();
    expect(screen.getByText("Pending Staff Invites")).toBeInTheDocument();
    expect(screen.getByText("Recent Order order_123")).toBeInTheDocument();
    expect(await screen.findByText("Wallet Activity Count 1")).toBeInTheDocument();
    expect(screen.getByText("Transfer Inbox")).toBeInTheDocument();
    expect(screen.getByText("Owned Ticket List")).toBeInTheDocument();
  });

  it("signs out and routes to auth when the account panel triggers sign-out", async () => {
    render(<WalletSurface eventSlug="campus-neon-takeover" />);

    await userEvent.click(screen.getByRole("button", { name: /sign out now/i }));

    expect(signOut).toHaveBeenCalledWith({
      notice: "You signed out successfully. Sign in again to continue.",
    });
    expect(push).toHaveBeenCalledWith(
      "/auth?mode=login&next=%2Fwallet%3FeventSlug%3Dcampus-neon-takeover&eventSlug=campus-neon-takeover",
    );
  });
});
