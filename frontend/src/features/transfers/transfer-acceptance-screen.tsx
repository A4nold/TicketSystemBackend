"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  acceptTransfer,
  getTransferAcceptPath,
} from "@/lib/transfers/transfers-client";

type PublicTicketDetail = {
  event: {
    startsAt: string;
    title: string;
  };
  latestTransfer: {
    acceptedAt: string | null;
    expiresAt: string;
    reminderSentAt: string | null;
    recipientEmail: string | null;
    status: string;
  } | null;
  serialNumber: string;
  status: string;
  ticketType: {
    name: string;
  };
};

type TransferAcceptanceScreenProps = Readonly<{
  serialNumber: string;
}>;

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getUnavailableTransferMessage(
  transfer: PublicTicketDetail["latestTransfer"] | undefined,
  ticketStatus: string | undefined,
) {
  if (transfer?.status === "CANCELLED") {
    return "This transfer was cancelled by the sender, so the current acceptance link is no longer usable.";
  }

  if (transfer?.status === "ACCEPTED") {
    return "This transfer has already been accepted, so the ticket has already moved to its new owner.";
  }

  if (transfer?.status === "EXPIRED") {
    return "This transfer expired before acceptance was completed, so the ticket stayed with the original owner.";
  }

  if (ticketStatus === "ISSUED" || ticketStatus === "PAID") {
    return "This ticket is no longer in a transfer-pending state, so there is no active transfer to accept.";
  }

  return "This transfer can no longer be accepted in its current state. It may have expired, been cancelled, or already completed.";
}

function getTransferStateHeading(
  transfer: PublicTicketDetail["latestTransfer"] | undefined,
  ticketStatus: string | undefined,
) {
  if (transfer?.status === "PENDING" && ticketStatus === "TRANSFER_PENDING") {
    return "This ticket is waiting for your acceptance";
  }

  if (transfer?.status === "ACCEPTED") {
    return "This transfer has already been completed";
  }

  if (transfer?.status === "CANCELLED") {
    return "This transfer is no longer active";
  }

  if (transfer?.status === "EXPIRED") {
    return "This transfer expired before it was accepted";
  }

  return "This transfer is unavailable right now";
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Transfer could not be accepted right now. Please try again.";
}

async function getTransferTicketContext(serialNumber: string) {
  return apiFetch<PublicTicketDetail>(`/api/tickets/${serialNumber}`);
}

export function TransferAcceptanceScreen({
  serialNumber,
}: TransferAcceptanceScreenProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrating, session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextPath = getTransferAcceptPath(serialNumber);

  const ticketQuery = useQuery({
    queryFn: () => getTransferTicketContext(serialNumber),
    queryKey: ["transfer-accept-ticket", serialNumber],
    retry: 1,
  });

  const ticket = ticketQuery.data;
  const transfer = ticket?.latestTransfer;
  const needsAuth = !isHydrating && !isAuthenticated;
  const transferExpired =
    transfer?.status === "EXPIRED" ||
    (transfer?.status === "PENDING" && new Date(transfer.expiresAt) < new Date());
  const canAttemptAcceptance =
    transfer?.status === "PENDING" &&
    ticket?.status === "TRANSFER_PENDING" &&
    !transferExpired;
  const unavailableMessage = getUnavailableTransferMessage(transfer, ticket?.status);

  function beginAcceptance() {
    if (!session) {
      setErrorMessage("Sign in to accept this ticket transfer.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const accepted = await acceptTransfer(serialNumber, session.accessToken);
        setSuccessMessage(
          `Transfer accepted. Ticket ${accepted.serialNumber} is now moving into your account.`,
        );
        await ticketQuery.refetch();
        router.push(`/wallet/${encodeURIComponent(accepted.serialNumber)}`);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  if (needsAuth) {
    return (
      <Panel>
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Transfer acceptance
          </p>
          <h1 className="font-display text-3xl">Sign in to accept this ticket</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Ticket ownership can only move into an authenticated attendee account. Sign in
            or register, then you will return to this acceptance flow automatically.
          </p>
          <Link
            href={`/auth?mode=login&next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
          >
            Sign in to continue
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Transfer acceptance
          </p>
          <h1 className="font-display text-4xl">
            {getTransferStateHeading(transfer, ticket?.status)}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Review the ticket context first. Acceptance moves ownership into your
            wallet and changes who can use this ticket at entry.
          </p>
        </div>
      </Panel>

      {ticketQuery.isLoading || ticketQuery.isFetching ? (
        <Panel>
          <div className="space-y-3">
            <h2 className="font-display text-3xl">Loading transfer context</h2>
            <p className="text-sm leading-6 text-muted">
              We are confirming the latest ticket and transfer state from the backend.
            </p>
          </div>
        </Panel>
      ) : null}

      {ticketQuery.isError ? (
        <Panel className="border-warning/30 bg-warning/8">
          <div className="space-y-4">
            <h2 className="font-display text-3xl text-foreground">
              We could not load this transfer right now.
            </h2>
            <p className="text-sm leading-6 text-foreground/85">
              Retry before assuming the transfer is unavailable.
            </p>
            <button
              type="button"
              onClick={() => ticketQuery.refetch()}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Retry transfer lookup
            </button>
          </div>
        </Panel>
      ) : null}

      {ticket ? (
        <Panel>
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-3xl">{ticket.event.title}</h2>
              <p className="text-sm leading-6 text-muted">
                {ticket.ticketType.name} · {formatDateTime(ticket.event.startsAt)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  Ticket state
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {ticket.status.replaceAll("_", " ")}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Transfer state
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {transfer ? transfer.status.replaceAll("_", " ") : "No pending transfer"}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Recipient target
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {transfer?.recipientEmail ?? "Recipient account"}
                </p>
              </div>
            </div>

            {transfer ? (
              <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
                This transfer remains pending until you accept it. Once accepted, the ticket
                moves into your wallet and the previous owner loses active ownership.
                {" "}Expiry: {formatDateTime(transfer.expiresAt)}.
                {transfer.reminderSentAt
                  ? ` Last reminder: ${formatDateTime(transfer.reminderSentAt)}.`
                  : ""}
              </div>
            ) : null}

            {canAttemptAcceptance ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={beginAcceptance}
                  disabled={isPending}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending ? "Accepting transfer..." : "Accept transfer"}
                </button>
                <Link
                  href="/wallet"
                  className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                >
                  Back to wallet
                </Link>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-warning/30 bg-warning/8 px-4 py-3 text-sm leading-6 text-foreground/85">
                {unavailableMessage}
              </div>
            )}

            {successMessage ? (
              <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
