"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { TicketQrPanel } from "@/features/tickets/ticket-qr-panel";
import { TicketResalePanel } from "@/features/tickets/ticket-resale-panel";
import { TicketTransferPanel } from "@/features/tickets/ticket-transfer-panel";
import { getOwnedTicketBySerialNumber } from "@/lib/tickets/tickets-client";

type OwnedTicketDetailProps = Readonly<{
  serialNumber: string;
}>;

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatOptionalDate(date: string | null) {
  if (!date) {
    return "Not recorded";
  }

  return formatDateTime(date);
}

function getStatusMeta(ticket: {
  latestResaleListing: { status: string } | null;
  latestTransfer: { status: string } | null;
  scanSummary: { latestOutcome: string | null };
  status: string;
}) {
  switch (ticket.status) {
    case "ISSUED":
    case "PAID":
      return {
        badgeClass: "border-success/30 bg-success/10 text-success",
        heading: "Active and ready for entry",
        summary:
          "This ticket is currently in a normal active state and ready for the next step toward entry.",
      };
    case "TRANSFER_PENDING":
      return {
        badgeClass: "border-warning/30 bg-warning/10 text-warning",
        heading: "Transfer is still pending",
        summary:
          ticket.latestTransfer?.status === "PENDING"
            ? "Ownership has not changed yet. This ticket is waiting for the transfer recipient to complete acceptance."
            : "This ticket is in a transfer-related state and should not be treated like a normal active ticket yet.",
      };
    case "RESALE_LISTED":
      return {
        badgeClass: "border-accent/30 bg-accent/10 text-accent",
        heading: "Listed for resale",
        summary:
          ticket.latestResaleListing?.status === "LISTED"
            ? "This ticket is currently listed for resale, so its normal attendee readiness is limited until that listing changes."
            : "This ticket is in a resale-related state and is not currently behaving like a normal active ticket.",
      };
    case "USED":
      return {
        badgeClass: "border-border bg-black/10 text-muted",
        heading: "Already used at entry",
        summary:
          "The latest backend state shows this ticket has already been used, so it should not be presented again for normal entry.",
      };
    default:
      return {
        badgeClass: "border-danger/30 bg-danger/10 text-danger",
        heading: "This ticket is not currently active",
        summary:
          "This ticket is currently limited by its backend state, so it should not be treated as normally ready until that state changes.",
      };
  }
}

function isQrEligible(status: string) {
  return status === "ISSUED" || status === "PAID";
}

export function OwnedTicketDetail({ serialNumber }: OwnedTicketDetailProps) {
  const { session } = useAuth();
  const nextPath = `/tickets/${encodeURIComponent(serialNumber)}`;
  const ticketQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => getOwnedTicketBySerialNumber(serialNumber, session!.accessToken),
    queryKey: ["owned-ticket-detail", serialNumber, session?.accessToken],
  });

  const ticket = ticketQuery.data;
  const statusMeta = ticket ? getStatusMeta(ticket) : null;

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <div className="space-y-6">
        {ticketQuery.isLoading || ticketQuery.isFetching ? (
          <Panel>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
                Ticket detail
              </p>
              <h1 className="font-display text-3xl">Loading ticket detail</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
                We are opening your owned ticket from the backend.
              </p>
            </div>
          </Panel>
        ) : null}

        {ticketQuery.isError ? (
          <Panel className="border-warning/30 bg-warning/8">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-warning">
                  Ticket detail unavailable
                </p>
                <h1 className="font-display text-3xl text-foreground">
                  This ticket is unavailable right now.
                </h1>
                <p className="text-sm leading-6 text-foreground/85">
                  Retry the ticket lookup or return to your wallet. If this ticket is
                  no longer owned by this account, it will stay unavailable here.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => ticketQuery.refetch()}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                >
                  Retry ticket detail
                </button>
                <Link
                  href="/tickets"
                  className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                >
                  Back to wallet
                </Link>
              </div>
            </div>
          </Panel>
        ) : null}

        {ticket && statusMeta ? (
          <>
            <Panel className={statusMeta.badgeClass}>
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
                    Ticket detail
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <h1 className="font-display text-4xl">
                        {statusMeta.heading}
                      </h1>
                      <p className="max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
                        {statusMeta.summary}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${statusMeta.badgeClass}`}
                    >
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {ticket.event.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDateTime(ticket.event.startsAt)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Ticket type
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {ticket.ticketType.name}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Serial
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">
                      {ticket.serialNumber}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Ownership revision
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {ticket.ownershipRevision}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => ticketQuery.refetch()}
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                  >
                    Refresh ticket state
                  </button>
                  <Link
                    href="/tickets"
                    className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                  >
                    Back to wallet
                  </Link>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
                    Live state context
                  </p>
                  <h2 className="font-display text-3xl">
                    Current ticket truth from the backend
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Issued at
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatOptionalDate(ticket.issuedAt)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Used at
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatOptionalDate(ticket.usedAt)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Latest scan
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {ticket.scanSummary.latestOutcome
                        ? ticket.scanSummary.latestOutcome.replaceAll("_", " ")
                        : "No scans recorded"}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Last scanned
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatOptionalDate(ticket.scanSummary.lastScannedAt)}
                    </p>
                  </div>
                </div>

                {ticket.latestTransfer || ticket.latestResaleListing ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {ticket.latestTransfer ? (
                      <div className="rounded-[1.3rem] border border-warning/20 bg-warning/8 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">
                          Latest transfer
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {ticket.latestTransfer.status.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Recipient: {ticket.latestTransfer.recipientEmail ?? "Not provided"}.
                          {" "}Expires: {formatDateTime(ticket.latestTransfer.expiresAt)}.
                        </p>
                      </div>
                    ) : null}
                    {ticket.latestResaleListing ? (
                      <div className="rounded-[1.3rem] border border-accent/20 bg-accent/8 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                          Latest resale
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {ticket.latestResaleListing.status.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Asking price {ticket.latestResaleListing.askingPrice}{" "}
                          {ticket.latestResaleListing.currency}.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Panel>

            <TicketQrPanel
              serialNumber={ticket.serialNumber}
              isQrAvailable={isQrEligible(ticket.status)}
              stateLabel={ticket.status.replaceAll("_", " ")}
              stateSummary={statusMeta.summary}
            />

            <TicketTransferPanel
              latestTransfer={ticket.latestTransfer}
              serialNumber={ticket.serialNumber}
              status={ticket.status}
              onTransferCreated={() => ticketQuery.refetch()}
            />

            <TicketResalePanel
              latestResaleListing={ticket.latestResaleListing}
              latestTransfer={ticket.latestTransfer}
              serialNumber={ticket.serialNumber}
              status={ticket.status}
              onResaleCreated={() => ticketQuery.refetch()}
            />

            <Panel>
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
                    Ownership history
                  </p>
                  <h2 className="font-display text-3xl">
                    Why this ticket is in its current state
                  </h2>
                </div>

                <div className="space-y-3">
                  {ticket.ownershipHistory.map((historyItem, index) => (
                    <div
                      key={`${historyItem.revision}-${historyItem.createdAt}-${historyItem.changeType}-${historyItem.fromEmail ?? "system"}-${historyItem.toEmail ?? "current"}-${index}`}
                      className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {historyItem.changeType.replaceAll("_", " ")} · Revision {historyItem.revision}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(historyItem.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        From: {historyItem.fromEmail ?? "System"} · To: {historyItem.toEmail ?? "Current owner"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </ProtectedSurfaceGate>
  );
}
