import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutReturnStatus } from "@/features/checkout/checkout-return-status";
import { getOrderById } from "@/lib/orders/orders-client";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    session: createSession(createUser()),
  }),
}));

vi.mock("@/features/auth/protected-surface-gate", () => ({
  ProtectedSurfaceGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/orders/orders-client", () => ({
  getOrderById: vi.fn(),
}));

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    accountType: "ATTENDEE",
    appRoles: ["attendee"],
    email: "ada@student.ie",
    firstName: "Ada",
    id: "user_123",
    lastName: "Eze",
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

function renderStatus(props: React.ComponentProps<typeof CheckoutReturnStatus>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutReturnStatus {...props} />
    </QueryClientProvider>,
  );
}

describe("CheckoutReturnStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows paid success state with issued tickets and attendee handoff link", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      cancelledAt: null,
      checkoutSessionId: "cs_123",
      checkoutStatus: "complete",
      checkoutUrl: "https://checkout.stripe.test/session",
      currency: "EUR",
      event: {
        id: "event_1",
        slug: "campus-neon-takeover",
        startsAt: "2026-05-01T21:00:00.000Z",
        title: "Campus Neon Takeover",
      },
      feeAmount: "1.50",
      id: "order_123",
      idempotencyKey: "idem_123",
      isAwaitingPaymentConfirmation: false,
      items: [],
      paidAt: "2026-04-10T12:00:00.000Z",
      paymentProvider: "STRIPE",
      paymentReference: "pi_123",
      paymentStatus: "paid",
      status: "PAID",
      subtotalAmount: "15.00",
      tickets: [
        {
          id: "ticket_1",
          issuedAt: "2026-04-10T12:00:00.000Z",
          ownershipRevision: 1,
          qrTokenId: "qr_123",
          serialNumber: "CNT-GA-0001",
          status: "ISSUED",
        },
      ],
      totalAmount: "16.50",
    });

    renderStatus({
      mode: "success",
      orderId: "order_123",
      sessionId: "cs_123",
    });

    expect(await screen.findByText(/your order is paid\./i)).toBeInTheDocument();
    expect(screen.getByText("CNT-GA-0001")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue to your wallet/i }),
    ).toHaveAttribute("href", "/wallet?recentOrderId=order_123");
  });

  it("shows pending payment confirmation state when backend truth is not final yet", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      cancelledAt: null,
      checkoutSessionId: "cs_456",
      checkoutStatus: "open",
      checkoutUrl: "https://checkout.stripe.test/session",
      currency: "EUR",
      event: {
        id: "event_1",
        slug: "campus-neon-takeover",
        startsAt: "2026-05-01T21:00:00.000Z",
        title: "Campus Neon Takeover",
      },
      feeAmount: "1.50",
      id: "order_456",
      idempotencyKey: "idem_456",
      isAwaitingPaymentConfirmation: true,
      items: [],
      paidAt: null,
      paymentProvider: "STRIPE",
      paymentReference: null,
      paymentStatus: "unpaid",
      status: "PENDING",
      subtotalAmount: "15.00",
      tickets: [],
      totalAmount: "16.50",
    });

    renderStatus({
      mode: "success",
      orderId: "order_456",
      sessionId: "cs_456",
    });

    expect(
      await screen.findByText(/your purchase is still being finalized\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/current payment state: unpaid\./i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh payment status/i }),
    ).toBeInTheDocument();
  });
});
