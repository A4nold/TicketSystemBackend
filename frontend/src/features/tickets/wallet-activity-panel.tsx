"use client";

import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";

type WalletActivityPanelProps = Readonly<{
  recentOrderId?: string;
  tickets: OwnedTicketSummary[];
}>;

function formatEventTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getUpcomingTicket(tickets: OwnedTicketSummary[]) {
  return [...tickets]
    .filter((ticket) => ticket.status === "ISSUED" || ticket.status === "PAID")
    .sort(
      (left, right) =>
        new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime(),
    )[0];
}

export function WalletActivityPanel({
  recentOrderId,
  tickets,
}: WalletActivityPanelProps) {
  const transferPendingCount = tickets.filter((ticket) => ticket.status === "TRANSFER_PENDING").length;
  const resaleListedCount = tickets.filter((ticket) => ticket.status === "RESALE_LISTED").length;
  const upcomingTicket = getUpcomingTicket(tickets);

  return (
    <Panel>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Wallet activity
          </p>
          <h2 className="font-display text-3xl">Recent activity across your account</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
            Purchases, transfers, resale exposure, and the next active event now sit in one wallet layer.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Latest purchase
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {recentOrderId ? "Recently completed" : "No fresh checkout"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {recentOrderId
                ? `Order ${recentOrderId} is attached to this wallet session.`
                : "The next completed checkout will appear here automatically."}
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Pending transfers
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {transferPendingCount} ticket{transferPendingCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tickets waiting on transfer completion remain visible until ownership settles.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Resale listings
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {resaleListedCount} active listing{resaleListedCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Listed tickets stay grouped under the event they belong to.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Up next
            </p>
            {upcomingTicket ? (
              <>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {upcomingTicket.event.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {formatEventTime(upcomingTicket.event.startsAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">
                Your next active event will appear here once the wallet has an issued ticket.
              </p>
            )}
          </div>
        </div>

        {upcomingTicket ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/wallet/${encodeURIComponent(upcomingTicket.serialNumber)}`}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Open next ticket
            </Link>
            <Link
              href={`/wallet?eventSlug=${encodeURIComponent(upcomingTicket.event.slug)}`}
              className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
            >
              Filter this event
            </Link>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
