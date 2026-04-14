"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import {
  cancelTransfer,
  createTransfer,
  getTransferAcceptPath,
  remindTransfer,
} from "@/lib/transfers/transfers-client";

type TicketTransferPanelProps = Readonly<{
  latestTransfer:
    | {
        expiresAt: string;
        reminderSentAt: string | null;
        recipientEmail: string | null;
        senderUserId: string;
        status: string;
      }
    | null;
  onTransferCreated: () => Promise<unknown> | unknown;
  serialNumber: string;
  status: string;
}>;

const transferSchema = z.object({
  message: z
    .string()
    .max(240, "Message must be 240 characters or fewer.")
    .optional(),
  recipientEmail: z.email("Enter a valid recipient email address."),
});

function getTransferEligibility(status: string) {
  switch (status) {
    case "ISSUED":
    case "PAID":
      return {
        canTransfer: true,
        tone: "success",
        summary:
          "Start a transfer only if you are ready to hand this ticket off. Ownership does not change until the recipient accepts.",
      };
    case "TRANSFER_PENDING":
      return {
        canTransfer: false,
        tone: "warning",
        summary:
          "This ticket already has a pending transfer request, so a second transfer cannot start yet.",
      };
    case "RESALE_LISTED":
      return {
        canTransfer: false,
        tone: "warning",
        summary:
          "This ticket is currently listed for resale, so transfer is blocked until that resale state changes.",
      };
    case "USED":
      return {
        canTransfer: false,
        tone: "danger",
        summary:
          "This ticket has already been used and cannot be transferred.",
      };
    default:
      return {
        canTransfer: false,
        tone: "danger",
        summary:
          "This ticket is not in an eligible state for transfer right now.",
      };
  }
}

function getPendingTransferRecipientSummary(
  latestTransfer: TicketTransferPanelProps["latestTransfer"],
) {
  if (!latestTransfer || latestTransfer.status !== "PENDING") {
    return null;
  }

  if (latestTransfer.recipientEmail) {
    return `Waiting on ${latestTransfer.recipientEmail} to accept before ownership changes.`;
  }

  return "Waiting on the selected recipient to accept before ownership changes.";
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getTransferCancellationState(
  status: string,
  latestTransfer: TicketTransferPanelProps["latestTransfer"],
  currentUserId: string | null,
) {
  const isPendingTransfer =
    status === "TRANSFER_PENDING" &&
    latestTransfer?.status === "PENDING" &&
    latestTransfer.senderUserId === currentUserId;

  if (isPendingTransfer) {
    return {
      canCancel: true,
      summary:
        "You can cancel this pending transfer before the recipient accepts it. Cancelling invalidates the current acceptance link.",
    };
  }

  if (status === "TRANSFER_PENDING") {
    return {
      canCancel: false,
      summary:
        "This pending transfer was not started by the current owner, so it cannot be cancelled from this ticket view.",
    };
  }

  return {
    canCancel: false,
    summary:
      "There is no active pending transfer to cancel on this ticket right now.",
  };
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Transfer could not start right now. Please try again.";
}

export function TicketTransferPanel({
  latestTransfer,
  onTransferCreated,
  serialNumber,
  status,
}: TicketTransferPanelProps) {
  const { session } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [acceptPath, setAcceptPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const eligibility = getTransferEligibility(status);
  const cancellation = getTransferCancellationState(
    status,
    latestTransfer,
    session?.user.id ?? null,
  );
  const transferExpired =
    latestTransfer?.status === "EXPIRED" ||
    (latestTransfer?.status === "PENDING" &&
      new Date(latestTransfer.expiresAt) < new Date());
  const canRemind =
    status === "TRANSFER_PENDING" &&
    latestTransfer?.status === "PENDING" &&
    latestTransfer.senderUserId === session?.user.id &&
    !transferExpired;

  async function submitTransfer() {
    if (!session) {
      setErrorMessage("Your attendee session is not available. Sign in again to continue.");
      return;
    }

    const parsed = transferSchema.safeParse({
      message: message || undefined,
      recipientEmail,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check the transfer details.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setAcceptPath(null);

    startTransition(async () => {
      try {
        const transfer = await createTransfer(serialNumber, parsed.data, session.accessToken);
        await onTransferCreated();
        setAcceptPath(getTransferAcceptPath(transfer.serialNumber));
        setSuccessMessage(
          `Transfer started for ${transfer.recipientEmail ?? "the selected recipient"}. Ownership stays with you until acceptance is completed.`,
        );
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  function submitCancellation() {
    if (!session) {
      setErrorMessage("Your attendee session is not available. Sign in again to continue.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const transfer = await cancelTransfer(serialNumber, session.accessToken);
        await onTransferCreated();
        setAcceptPath(null);
        setSuccessMessage(
          `Transfer cancelled. Ticket ${transfer.serialNumber} stays in your account and the previous acceptance link is no longer usable.`,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Transfer cancellation could not be completed right now. Please try again.",
        );
      }
    });
  }

  function submitReminder() {
    if (!session) {
      setErrorMessage("Your attendee session is not available. Sign in again to continue.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const transfer = await remindTransfer(serialNumber, session.accessToken);
        await onTransferCreated();
        setAcceptPath(getTransferAcceptPath(transfer.serialNumber));
        setSuccessMessage(
          `Reminder sent. The recipient can still accept ticket ${transfer.serialNumber} before ${formatDateTime(transfer.expiresAt)}.`,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Transfer reminder could not be sent right now. Please try again.",
        );
      }
    });
  }

  const toneClass =
    eligibility.tone === "success"
      ? "border-success/30 bg-success/10"
      : eligibility.tone === "warning"
        ? "border-warning/30 bg-warning/8"
        : "border-danger/30 bg-danger/10";

  return (
    <Panel className={toneClass}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Transfer ticket
          </p>
          <h2 className="font-display text-3xl text-foreground">
            {eligibility.canTransfer
              ? "Start a controlled ticket transfer"
              : "Transfer is unavailable right now"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-foreground/85">
            {eligibility.summary}
          </p>
        </div>

        {status === "TRANSFER_PENDING" && latestTransfer?.status === "PENDING" ? (
          <div className="rounded-[1.2rem] border border-warning/30 bg-warning/8 px-4 py-3 text-sm leading-6 text-foreground/85">
            {getPendingTransferRecipientSummary(latestTransfer)}
            {" "}Expires: {formatDateTime(latestTransfer.expiresAt)}.
            {latestTransfer.reminderSentAt
              ? ` Last reminder: ${formatDateTime(latestTransfer.reminderSentAt)}.`
              : ""}
          </div>
        ) : null}

        {latestTransfer?.status === "EXPIRED" ? (
          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
            The latest transfer request expired before the recipient accepted it. This ticket stays with you and can be transferred again if you still need to hand it off.
          </div>
        ) : null}

        {eligibility.canTransfer ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Recipient email
              </span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent/50"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Optional note
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder="Sending you my ticket for tonight."
                className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent/50"
              />
            </label>

            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
              Starting a transfer does not immediately remove the ticket from your account.
              The ticket becomes <span className="font-medium text-foreground">transfer pending</span>{" "}
              until the recipient accepts it.
            </div>

            <button
              type="button"
              onClick={submitTransfer}
              disabled={isPending}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isPending ? "Starting transfer..." : "Start transfer"}
            </button>
          </div>
        ) : null}

        {cancellation.canCancel ? (
          <div className="space-y-4 rounded-[1.2rem] border border-warning/20 bg-warning/8 px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">
                Pending transfer management
              </p>
              <p className="text-sm leading-6 text-foreground/85">
                {cancellation.summary}
              </p>
            </div>

            {latestTransfer ? (
              <div className="rounded-[1rem] border border-warning/20 bg-black/10 px-3 py-3 text-sm leading-6 text-muted">
                Recipient: {latestTransfer.recipientEmail ?? "Not provided"}. Expires:{" "}
                {formatDateTime(latestTransfer.expiresAt)}
                .
                {latestTransfer.reminderSentAt
                  ? ` Last reminder: ${formatDateTime(latestTransfer.reminderSentAt)}.`
                  : ""}
              </div>
            ) : null}

            <div className="rounded-[1rem] border border-border bg-black/10 px-3 py-3 text-sm leading-6 text-muted">
              Cancelling now keeps the ticket with you and invalidates the recipient&apos;s
              current acceptance link immediately.
            </div>

            <div className="flex flex-wrap gap-3">
              {canRemind ? (
                <button
                  type="button"
                  onClick={submitReminder}
                  disabled={isPending}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending ? "Sending reminder..." : "Send reminder"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={submitCancellation}
                disabled={isPending}
                className="inline-flex rounded-full border border-warning/40 bg-warning/12 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-warning/60 hover:bg-warning/18 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isPending ? "Cancelling transfer..." : "Cancel transfer"}
              </button>
            </div>
          </div>
        ) : null}

        {!eligibility.canTransfer && !cancellation.canCancel ? (
          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
            {cancellation.summary}
          </div>
        ) : null}

        {successMessage ? (
          <div className="space-y-3 rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
            <p>{successMessage}</p>
            {acceptPath ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground/85">
                  Share this acceptance path with the recipient:
                </p>
                <div className="rounded-[1rem] border border-success/20 bg-black/10 px-3 py-2 font-mono text-xs text-foreground">
                  {acceptPath}
                </div>
              </div>
            ) : null}
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
