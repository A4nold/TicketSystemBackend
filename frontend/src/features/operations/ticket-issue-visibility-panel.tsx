"use client";

import { useMemo, useState, useTransition } from "react";

import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import {
  getOperationalTicketIssue,
  type OperationalTicketIssueDetail,
} from "@/lib/operations/tickets-client";

type TicketIssueVisibilityPanelProps = Readonly<{
  accessToken: string;
  eventId: string;
  mode: "organizer" | "scanner";
}>;

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function deriveIssueSummary(ticket: OperationalTicketIssueDetail) {
  if (ticket.status === "USED") {
    return {
      body: "This ticket has already been used for entry and should not be admitted again.",
      heading: "Already used",
      tone: "danger",
    } as const;
  }

  if (ticket.status === "TRANSFER_PENDING") {
    return {
      body: ticket.latestTransfer?.recipientEmail
        ? `The ticket is in a pending transfer flow to ${ticket.latestTransfer.recipientEmail}.`
        : "The ticket is currently pending transfer and is not in a normal active state.",
      heading: "Transfer pending",
      tone: "accent",
    } as const;
  }

  if (ticket.status === "RESALE_LISTED") {
    return {
      body: "This ticket is currently listed for organizer-controlled resale and is not in a normal active state.",
      heading: "Resale listed",
      tone: "accent",
    } as const;
  }

  if (ticket.status === "CANCELLED") {
    return {
      body: "This ticket has been cancelled and should not be admitted.",
      heading: "Cancelled ticket",
      tone: "danger",
    } as const;
  }

  if (ticket.status === "REFUNDED") {
    return {
      body: "This ticket has been refunded and should not be admitted.",
      heading: "Refunded ticket",
      tone: "danger",
    } as const;
  }

  if (ticket.status === "RESERVED") {
    return {
      body: "This ticket is reserved and not yet in a normal issued state.",
      heading: "Reserved ticket",
      tone: "accent",
    } as const;
  }

  return {
    body: "This ticket is currently active and in a normal issued state unless another operational rule says otherwise.",
    heading: "Ticket active",
    tone: "success",
  } as const;
}

export function TicketIssueVisibilityPanel({
  accessToken,
  eventId,
  mode,
}: TicketIssueVisibilityPanelProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [ticket, setTicket] = useState<OperationalTicketIssueDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const issueSummary = useMemo(
    () => (ticket ? deriveIssueSummary(ticket) : null),
    [ticket],
  );

  function submitLookup() {
    const trimmedSerial = serialNumber.trim().toUpperCase();

    if (!trimmedSerial) {
      setErrorMessage("Enter a ticket serial number before looking up an issue.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await getOperationalTicketIssue(eventId, trimmedSerial, accessToken);
        setTicket(result);
      } catch (error) {
        setTicket(null);
        setErrorMessage(
          getErrorText(
            error,
            "The ticket issue context could not be loaded right now. Please try again.",
          ),
        );
      }
    });
  }

  return (
    <Panel>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Ticket issue visibility
          </p>
          <h3 className="font-display text-3xl">
            Understand the ticket state before making a door decision
          </h3>
          <p className="text-sm leading-6 text-muted">
            {mode === "scanner"
              ? "Look up a ticket by serial number when a scan result needs more context than the immediate validation outcome."
              : "Look up an event ticket by serial number to understand the current issue state without relying on hidden system knowledge."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value.toUpperCase())}
            placeholder="CNT-GA-0002"
            className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
          />
          <button
            type="button"
            onClick={submitLookup}
            disabled={isPending}
            className="inline-flex rounded-full border border-accent-warm/50 bg-accent-warm/12 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent-warm/70 hover:bg-accent-warm/18 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isPending ? "Loading issue..." : "Lookup ticket"}
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}

        {ticket && issueSummary ? (
          <div className="space-y-4">
            <div
              className={`rounded-[1.35rem] border px-4 py-4 ${
                issueSummary.tone === "success"
                  ? "border-success/30 bg-success/10"
                  : issueSummary.tone === "accent"
                    ? "border-accent-warm/30 bg-accent-warm/10"
                    : "border-danger/30 bg-danger/10"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Current issue summary
              </p>
              <h4 className="mt-2 text-lg font-semibold text-foreground">
                {issueSummary.heading}
              </h4>
              <p className="mt-2 text-sm leading-6 text-foreground/90">
                {issueSummary.body}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Serial
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {ticket.serialNumber}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Current status
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {ticket.status}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Latest scan
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {ticket.scanSummary.latestOutcome ?? "No scans yet"}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Current owner
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {ticket.currentOwner.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Operational context
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <p>Ticket type: {ticket.ticketType.name}</p>
                  <p>Event: {ticket.event.title}</p>
                  <p>Last scanned: {formatDateTime(ticket.scanSummary.lastScannedAt)}</p>
                  <p>Total attempts: {ticket.scanSummary.totalAttempts}</p>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Current limiting workflow
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <p>
                    Transfer:{" "}
                    {ticket.latestTransfer
                      ? `${ticket.latestTransfer.status} ${ticket.latestTransfer.recipientEmail ? `to ${ticket.latestTransfer.recipientEmail}` : ""}`
                      : "No active transfer"}
                  </p>
                  <p>
                    Resale:{" "}
                    {ticket.latestResaleListing
                      ? `${ticket.latestResaleListing.status} at ${ticket.latestResaleListing.askingPrice} ${ticket.latestResaleListing.currency}`
                      : "No active resale listing"}
                  </p>
                  <p>Used at: {formatDateTime(ticket.usedAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Incident timeline
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ...ticket.ownershipHistory.map((item) => ({
                    detail: `${item.changeType} · ${item.fromEmail ?? "System"} -> ${item.toEmail ?? "Current owner"}`,
                    timestamp: item.createdAt,
                    title: `Ownership revision ${item.revision}`,
                  })),
                  ...ticket.transferHistory.map((item) => ({
                    detail: `${item.status}${item.recipientEmail ? ` · ${item.recipientEmail}` : ""}`,
                    timestamp: item.createdAt,
                    title: "Transfer event",
                  })),
                  ...ticket.resaleHistory.map((item) => ({
                    detail: `${item.status} · ${item.askingPrice} ${item.currency}`,
                    timestamp: item.createdAt,
                    title: "Resale event",
                  })),
                  ...ticket.scanAttempts.map((item) => ({
                    detail: `${item.outcome}${item.reasonCode ? ` · ${item.reasonCode}` : ""}${item.scannedByEmail ? ` · ${item.scannedByEmail}` : ""}`,
                    timestamp: item.scannedAt,
                    title: "Scan attempt",
                  })),
                ]
                  .sort(
                    (left, right) =>
                      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
                  )
                  .slice(0, 12)
                  .map((entry, index) => (
                    <div
                      key={`${entry.title}-${entry.timestamp}-${index}`}
                      className="rounded-[1.1rem] border border-border bg-black/15 px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {entry.title}
                          </p>
                          <p className="text-sm leading-6 text-muted">{entry.detail}</p>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          {formatDateTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
