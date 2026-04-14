import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TicketTransferPanel } from "@/features/tickets/ticket-transfer-panel";

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

describe("TicketTransferPanel", () => {
  it("shows reminder and cancellation controls for owner-started pending transfers", async () => {
    render(
      <TicketTransferPanel
        latestTransfer={{
          expiresAt: "2099-05-02T21:00:00.000Z",
          recipientEmail: "friend@example.com",
          reminderSentAt: "2099-05-01T12:00:00.000Z",
          senderUserId: "user_1",
          status: "PENDING",
        }}
        onTransferCreated={() => undefined}
        serialNumber="CNT-GA-0001"
        status="TRANSFER_PENDING"
      />,
    );

    expect(await screen.findByText(/waiting on friend@example.com to accept/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reminder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel transfer/i })).toBeInTheDocument();
  });

  it("blocks transfer creation while a ticket is listed for resale", async () => {
    render(
      <TicketTransferPanel
        latestTransfer={null}
        onTransferCreated={() => undefined}
        serialNumber="CNT-GA-0001"
        status="RESALE_LISTED"
      />,
    );

    expect(await screen.findByText(/transfer is unavailable right now/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this ticket is currently listed for resale, so transfer is blocked/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start transfer/i })).not.toBeInTheDocument();
  });
});
