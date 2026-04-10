"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import {
  acceptTransfer,
  listIncomingTransfers,
} from "@/lib/transfers/transfers-client";

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getTransferStateCopy(status: string) {
  switch (status) {
    case "PENDING":
      return "Waiting for your decision";
    case "ACCEPTED":
      return "Already accepted";
    case "CANCELLED":
      return "Cancelled by sender";
    default:
      return status.replaceAll("_", " ");
  }
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "This transfer could not be accepted right now. Please try again.";
}

export function PendingTransferInboxPanel() {
  const router = useRouter();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingSerialNumber, setPendingSerialNumber] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const transferQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listIncomingTransfers(session!.accessToken),
    queryKey: ["incoming-transfers", session?.accessToken],
  });

  const transfers = transferQuery.data ?? [];

  function beginAcceptance(serialNumber: string) {
    if (!session) {
      setErrorMessage("Sign in again to accept this transfer.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingSerialNumber(serialNumber);

    startTransition(async () => {
      try {
        const accepted = await acceptTransfer(serialNumber, session.accessToken);
        await transferQuery.refetch();
        setSuccessMessage(
          `Transfer accepted. Ticket ${accepted.serialNumber} is now in your wallet.`,
        );
        router.push(`/wallet/${encodeURIComponent(accepted.serialNumber)}`);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      } finally {
        setPendingSerialNumber(null);
      }
    });
  }

  if (transferQuery.isLoading || transferQuery.isFetching) {
    return (
      <Panel>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Transfer inbox
          </p>
          <p className="text-sm leading-6 text-muted">
            Checking whether any tickets are waiting for your review.
          </p>
        </div>
      </Panel>
    );
  }

  if (transferQuery.isError || transfers.length === 0) {
    return null;
  }

  return (
    <Panel className="border-accent/30 bg-accent/8">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Transfer inbox
          </p>
          <h2 className="font-display text-3xl">Tickets are waiting for your review</h2>
          <p className="max-w-3xl text-sm leading-6 text-foreground/85">
            Incoming transfers now appear inside the wallet so you can review and accept them without relying only on email.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Incoming transfer
              </p>
              <h3 className="mt-2 font-display text-2xl text-foreground">
                {transfer.event.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                {transfer.ticketType.name} · {formatDateTime(transfer.event.startsAt)}
              </p>
              <p className="mt-3 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                {getTransferStateCopy(transfer.status)}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/85">
                From: {transfer.senderEmail} · Serial: {transfer.serialNumber}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Accepting this ticket moves ownership into your wallet. Expires: {formatDateTime(transfer.expiresAt)}
              </p>
              {transfer.message ? (
                <p className="mt-3 rounded-[1rem] border border-border bg-black/10 px-3 py-3 text-sm leading-6 text-muted">
                  {transfer.message}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => beginAcceptance(transfer.serialNumber)}
                  disabled={isPending && pendingSerialNumber === transfer.serialNumber}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending && pendingSerialNumber === transfer.serialNumber
                    ? "Accepting..."
                    : "Accept now"}
                </button>
                <Link
                  href={`/transfer/accept/${encodeURIComponent(transfer.serialNumber)}`}
                  className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
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
        </div>

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
  );
}
