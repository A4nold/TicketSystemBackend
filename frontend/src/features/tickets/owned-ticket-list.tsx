"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import {
  listOwnedTickets,
  type OwnedTicketSummary,
} from "@/lib/tickets/tickets-client";

type OwnedTicketListProps = Readonly<{
  eventSlug?: string;
  onTicketsLoaded?: (tickets: OwnedTicketSummary[]) => void;
}>;

function formatEventTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getStatusMeta(status: string) {
  switch (status) {
    case "ISSUED":
    case "PAID":
      return {
        badgeClass: "border-success/30 bg-success/10 text-success",
        description: "Ready in your account",
        priority: 0,
      };
    case "TRANSFER_PENDING":
      return {
        badgeClass: "border-warning/30 bg-warning/10 text-warning",
        description: "Transfer is still pending",
        priority: 2,
      };
    case "RESALE_LISTED":
      return {
        badgeClass: "border-accent/30 bg-accent/10 text-accent",
        description: "Currently listed for resale",
        priority: 3,
      };
    case "USED":
      return {
        badgeClass: "border-border bg-black/10 text-muted",
        description: "Already used at entry",
        priority: 4,
      };
    default:
      return {
        badgeClass: "border-danger/30 bg-danger/10 text-danger",
        description: "Not currently active",
        priority: 5,
      };
  }
}

function getSortedTickets(tickets: OwnedTicketSummary[]) {
  return [...tickets].sort((left, right) => {
    const leftMeta = getStatusMeta(left.status);
    const rightMeta = getStatusMeta(right.status);

    if (leftMeta.priority !== rightMeta.priority) {
      return leftMeta.priority - rightMeta.priority;
    }

    return new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime();
  });
}

function groupTicketsByEvent(tickets: OwnedTicketSummary[]) {
  const groups = new Map<
    string,
    {
      event: OwnedTicketSummary["event"];
      tickets: OwnedTicketSummary[];
    }
  >();

  for (const ticket of getSortedTickets(tickets)) {
    const current = groups.get(ticket.event.id);

    if (current) {
      current.tickets.push(ticket);
      continue;
    }

    groups.set(ticket.event.id, {
      event: ticket.event,
      tickets: [ticket],
    });
  }

  return [...groups.values()].sort(
    (left, right) =>
      new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime(),
  );
}

function TicketCard({
  ticket,
  isPrimary,
}: Readonly<{
  isPrimary: boolean;
  ticket: OwnedTicketSummary;
}>) {
  const statusMeta = getStatusMeta(ticket.status);

  return (
    <Link
      href={`/wallet/${encodeURIComponent(ticket.serialNumber)}`}
      className="block rounded-[1.6rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Panel
        className={isPrimary ? "border-success/25 bg-success/10" : "bg-surface/85"}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
                  {isPrimary ? "Next active ticket" : "Owned ticket"}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusMeta.badgeClass}`}
                >
                  {ticket.status.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="font-display text-2xl text-foreground">
                {ticket.event.title}
              </h2>
              <p className="text-sm leading-6 text-muted">
                {ticket.ticketType.name} · {formatEventTime(ticket.event.startsAt)}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Serial
              </p>
              <p className="mt-2 font-mono text-sm text-foreground">
                {ticket.serialNumber}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Ticket state
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {statusMeta.description}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Type
              </p>
              <p className="mt-2 text-sm text-foreground">
                {ticket.ticketType.name}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Scan history
              </p>
              <p className="mt-2 text-sm text-foreground">
                {ticket.scanSummary.latestOutcome
                  ? ticket.scanSummary.latestOutcome.replaceAll("_", " ")
                  : "No scans recorded"}
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

export function OwnedTicketList({ eventSlug, onTicketsLoaded }: OwnedTicketListProps) {
  const { session } = useAuth();
  const ticketQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () =>
      listOwnedTickets(session!.accessToken, {
        eventSlug,
        sort: "asc",
    }),
    queryKey: ["owned-tickets", session?.accessToken, eventSlug],
  });
  const tickets = useMemo(
    () => getSortedTickets(ticketQuery.data ?? []),
    [ticketQuery.data],
  );

  useEffect(() => {
    onTicketsLoaded?.(tickets);
  }, [onTicketsLoaded, tickets]);

  if (ticketQuery.isLoading || ticketQuery.isFetching) {
    return (
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Owned tickets
          </p>
          <h2 className="font-display text-3xl">Loading your wallet</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            We are pulling the latest ticket ownership state from the backend.
          </p>
        </div>
      </Panel>
    );
  }

  if (ticketQuery.isError) {
    return (
      <Panel className="border-warning/30 bg-warning/8">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-warning">
              Could not load owned tickets
            </p>
            <h2 className="font-display text-3xl text-foreground">
              Your ticket wallet needs another try.
            </h2>
            <p className="text-sm leading-6 text-foreground/85">
              We could not confirm the latest ownership list right now. Retry before
              assuming tickets are missing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => ticketQuery.refetch()}
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
          >
            Refresh wallet
          </button>
        </div>
      </Panel>
    );
  }

  if (tickets.length === 0) {
    return (
      <Panel>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Owned tickets
            </p>
            <h2 className="font-display text-3xl">No active owned tickets yet.</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Your wallet is empty right now. Once you purchase or receive a ticket, it
              will appear here with its current live state.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={eventSlug ? `/events/${eventSlug}` : "/"}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Browse event access
            </Link>
            <button
              type="button"
              onClick={() => ticketQuery.refetch()}
              className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
            >
              Refresh wallet
            </button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Owned tickets
            </p>
            <h2 className="font-display text-3xl">
              Your wallet is live and up to date.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Active tickets stay near the top, and every entry shows its current
              state before you open it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => ticketQuery.refetch()}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
          >
            Refresh wallet
          </button>
        </div>
      </Panel>

      {groupTicketsByEvent(tickets).map((group, groupIndex) => (
        <Panel key={group.event.id}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
                  {group.tickets.length} ticket{group.tickets.length === 1 ? "" : "s"} in wallet
                </p>
                <h3 className="font-display text-2xl text-foreground">{group.event.title}</h3>
                <p className="text-sm leading-6 text-muted">
                  {formatEventTime(group.event.startsAt)} · {group.event.status.replaceAll("_", " ")}
                </p>
              </div>

              <Link
                href={`/events/${group.event.slug}`}
                className="inline-flex rounded-full border border-border bg-white/8 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                View event
              </Link>
            </div>

            <div className="space-y-3">
              {group.tickets.map((ticket, ticketIndex) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isPrimary={groupIndex === 0 && ticketIndex === 0}
                />
              ))}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
