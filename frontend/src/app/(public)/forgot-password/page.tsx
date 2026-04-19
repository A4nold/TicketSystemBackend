"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { z } from "zod";

import { SupportEscalationPanel } from "@/components/support/support-escalation-panel";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { requestPasswordReset } from "@/lib/auth/auth-client";

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "We could not start password recovery. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = forgotPasswordSchema.safeParse({
      email,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Enter your account email.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response = await requestPasswordReset(parsed.data);
        setSuccessMessage(response.message);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)]">
      <Panel>
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Account recovery
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Reset your password and get back to your tickets.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Enter the email tied to your account and we will send a secure reset link.
              The same flow works for attendees, organizers, and scanner staff accounts.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Delivery
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Recovery links expire after 30 minutes to keep account access secure.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Privacy
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                We show the same confirmation message whether or not the email is registered.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Next
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Open the email on any device, choose a new password, and then sign back in.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="space-y-5">
          {successMessage ? (
            <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Email</span>
              <input
                required
                type="email"
                className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <div className="text-sm leading-6 text-muted">
            <p>
              Remembered it?{" "}
              <Link
                href="/auth?mode=login"
                className="font-medium text-accent transition hover:text-accent-strong"
              >
                Return to sign in
              </Link>
            </p>
          </div>

          <SupportEscalationPanel
            body="If the reset email does not arrive after a few minutes, contact support so they can verify the account and help you recover access before an event."
            subject="TicketSystem password reset help"
            title="Still waiting on the reset email?"
          />
        </div>
      </Panel>
    </div>
  );
}
