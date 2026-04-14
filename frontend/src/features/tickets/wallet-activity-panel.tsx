"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import {
  listWalletNotifications,
  markWalletNotificationAsRead,
} from "@/lib/notifications/notifications-client";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";
import { listIncomingTransfers } from "@/lib/transfers/transfers-client";

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

function getPostEventTickets(tickets: OwnedTicketSummary[]) {
  return tickets
    .filter((ticket) => ticket.event.postEventContent)
    .sort(
      (left, right) =>
        new Date(right.event.postEventContent!.publishedAt ?? 0).getTime() -
        new Date(left.event.postEventContent!.publishedAt ?? 0).getTime(),
    )
    .slice(0, 2);
}

export function WalletActivityPanel({
  recentOrderId,
  tickets,
}: WalletActivityPanelProps) {
  const router = useRouter();
  const { session } = useAuth();
  const notificationsQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listWalletNotifications(session!.accessToken),
    queryKey: ["wallet-notifications", session?.accessToken],
  });
  const incomingTransfersQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listIncomingTransfers(session!.accessToken),
    queryKey: ["incoming-transfers", session?.accessToken],
  });
  const transferPendingCount = tickets.filter((ticket) => ticket.status === "TRANSFER_PENDING").length;
  const resaleListedCount = tickets.filter((ticket) => ticket.status === "RESALE_LISTED").length;
  const upcomingTicket = getUpcomingTicket(tickets);
  const postEventTickets = getPostEventTickets(tickets);
  const notifications = notificationsQuery.data ?? [];
  const incomingTransfers = incomingTransfersQuery.data ?? [];
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "UNREAD",
  );
  const pendingActionsCount = unreadNotifications.length + incomingTransfers.length;
  const highlightedNotifications = unreadNotifications.slice(0, 3);
  const highlightedTransfers = incomingTransfers.slice(0, 2);

  async function openNotification(notificationId: string, actionUrl: string | null) {
    if (!session) {
      return;
    }

    await markWalletNotificationAsRead(notificationId, session.accessToken);
    await notificationsQuery.refetch();

    if (actionUrl) {
      router.push(actionUrl);
    }
  }

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
              Needs attention
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {pendingActionsCount} active item{pendingActionsCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Pending transfers and unread wallet updates are surfaced together here first.
            </p>
          </div>

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
              Pending handoffs
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {incomingTransfers.length} incoming · {transferPendingCount} outgoing
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Incoming transfer requests and tickets still awaiting handoff stay grouped together.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Marketplace exposure
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {resaleListedCount} active listing{resaleListedCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Listed tickets stay grouped under the event they belong to, with sale updates now fed into wallet activity.
            </p>
          </div>
        </div>

        {highlightedTransfers.length > 0 || highlightedNotifications.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[1.4rem] border border-accent/20 bg-accent/8 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Pending actions
                </p>
                <h3 className="font-display text-2xl text-foreground">
                  What needs your attention next
                </h3>
                <p className="text-sm leading-6 text-foreground/80">
                  Incoming transfers and unread wallet updates now share one attention layer before you drop into the detailed inbox.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {highlightedTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Incoming transfer
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {transfer.event.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      From {transfer.senderEmail} · Expires {formatEventTime(transfer.expiresAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/transfer/accept/${encodeURIComponent(transfer.serialNumber)}`}
                        className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                      >
                        Review transfer
                      </Link>
                      <Link
                        href={`/events/${transfer.event.slug}`}
                        className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                      >
                        View event
                      </Link>
                    </div>
                  </div>
                ))}

                {highlightedTransfers.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
                    No incoming transfers are waiting right now.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border bg-black/10 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Wallet updates
                </p>
                <h3 className="font-display text-2xl text-foreground">
                  Fresh signals from your tickets
                </h3>
              </div>

              <div className="mt-4 grid gap-3">
                {highlightedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                        New
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted">
                      {formatEventTime(notification.createdAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          openNotification(notification.id, notification.actionUrl)
                        }
                        className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                      >
                        Open update
                      </button>
                      <button
                        type="button"
                        onClick={() => openNotification(notification.id, null)}
                        className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                      >
                        Mark as read
                      </button>
                    </div>
                  </div>
                ))}

                {highlightedNotifications.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
                    No unread wallet updates yet. New transfer and resale changes will appear here.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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
            <p className="self-center text-sm leading-6 text-muted">
              Up next: {upcomingTicket.event.title} · {formatEventTime(upcomingTicket.event.startsAt)}
            </p>
          </div>
        ) : null}

        {postEventTickets.length > 0 ? (
          <div className="rounded-[1.4rem] border border-accent/20 bg-accent/8 px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                After the event
              </p>
              <h3 className="font-display text-2xl text-foreground">
                Fresh post-event content from organizers
              </h3>
              <p className="text-sm leading-6 text-foreground/80">
                Completed events can still deliver replay, follow-up access, or next-step CTAs inside your wallet.
              </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {postEventTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    {ticket.event.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {ticket.event.postEventContent?.message}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/wallet/${encodeURIComponent(ticket.serialNumber)}`}
                      className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                    >
                      Open ticket detail
                    </Link>
                    {ticket.event.postEventContent?.ctaLabel &&
                    ticket.event.postEventContent?.ctaUrl ? (
                      <a
                        href={ticket.event.postEventContent.ctaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                      >
                        {ticket.event.postEventContent.ctaLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
