"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { RecentOrderPanel } from "@/features/checkout/recent-order-panel";
import { PendingStaffInvitesPanel } from "@/features/staff/pending-staff-invites-panel";
import { PendingTransferInboxPanel } from "@/features/transfers/pending-transfer-inbox-panel";
import { OwnedTicketList } from "@/features/tickets/owned-ticket-list";
import { WalletActivityPanel } from "@/features/tickets/wallet-activity-panel";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";

type AttendeeGatewayProps = Readonly<{
  eventSlug?: string;
  recentOrderId?: string;
}>;

export function AttendeeGateway({ eventSlug, recentOrderId }: AttendeeGatewayProps) {
  const router = useRouter();
  const [walletTickets, setWalletTickets] = useState<OwnedTicketSummary[]>([]);
  const {
    clearNotice,
    notice,
    session,
    signOut,
  } = useAuth();
  const nextPath = eventSlug ? `/wallet?eventSlug=${eventSlug}` : "/wallet";
  const authHref = `/auth?mode=login&next=${encodeURIComponent(
    nextPath,
  )}${eventSlug ? `&eventSlug=${encodeURIComponent(eventSlug)}` : ""}`;

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <div className="space-y-6">
        <Panel>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Wallet
            </p>
            <h1 className="font-display text-3xl">
              Welcome back, {session?.user.firstName ?? "attendee"}.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Your account now centers on a live wallet view, so tickets, purchases,
              invites, and follow-up actions stay in one place after sign-in.
            </p>
          </div>
        </Panel>

        {notice ? (
          <Panel className="border-success/30 bg-success/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-success">{notice}</p>
              <button
                type="button"
                onClick={clearNotice}
                className="inline-flex rounded-full border border-success/35 px-4 py-2 text-sm font-medium text-success transition hover:bg-success/10"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        ) : null}

        <PendingStaffInvitesPanel />

        <PendingTransferInboxPanel />

        {recentOrderId ? <RecentOrderPanel orderId={recentOrderId} /> : null}

        <WalletActivityPanel
          recentOrderId={recentOrderId}
          tickets={walletTickets}
        />

        <Panel>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <h2 className="font-display text-2xl">Wallet overview</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Email
                  </p>
                  <p className="mt-2 text-sm text-foreground">{session?.user.email}</p>
                </div>
                <div className="rounded-2xl border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Account status
                  </p>
                  <p className="mt-2 text-sm text-foreground">{session?.user.status}</p>
                </div>
              </div>
              {eventSlug ? (
                <p className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
                  Event context preserved:
                  {" "}
                  <span className="font-medium text-foreground">{eventSlug}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  signOut({
                    notice: "You signed out successfully. Sign in again to continue.",
                  });
                  router.push(authHref);
                }}
                className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Sign out
              </button>
              <Link
                href={eventSlug ? `/events/${eventSlug}` : "/"}
                className="inline-flex rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-black/20"
              >
                Return to public view
              </Link>
            </div>
          </div>
        </Panel>

        <OwnedTicketList
          eventSlug={eventSlug}
          onTicketsLoaded={setWalletTickets}
        />
      </div>
    </ProtectedSurfaceGate>
  );
}
