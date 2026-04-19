"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useTransition } from "react";
import { z } from "zod";

import { SupportEscalationPanel } from "@/components/support/support-escalation-panel";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { resetPassword } from "@/lib/auth/auth-client";

const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your new password."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer.")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        "Password must include uppercase, lowercase, and a number.",
      ),
    token: z.string().min(1, "This reset link is incomplete. Request a new one."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "We could not reset your password. Please request a fresh link and try again.";
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = resetPasswordSchema.safeParse({
      confirmPassword,
      password,
      token,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check your new password.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response = await resetPassword({
          password: parsed.data.password,
          token: parsed.data.token,
        });
        setSuccessMessage(response.message);
        setTimeout(() => {
          router.push("/auth?mode=login");
        }, 1200);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  const hasToken = token.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)]">
      <Panel>
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Choose a new password
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Set a fresh password for your account.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Once you save a new password, any older reset links still waiting in your inbox
              stop working automatically.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Password rules
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Use at least 8 characters with uppercase, lowercase, and a number.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Link state
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Expired or already-used links are rejected and can be replaced with a new request.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Sign in next
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                After success, head back into your wallet, organizer workspace, or scanner access.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="space-y-5">
          {!hasToken ? (
            <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              This reset link is incomplete. Request a new password email to continue.
            </div>
          ) : null}

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
              <span className="font-medium text-foreground">New password</span>
              <input
                required
                type="password"
                className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Use a strong password"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Confirm password</span>
              <input
                required
                type="password"
                className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </label>

            <button
              type="submit"
              disabled={isPending || !hasToken}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Saving new password..." : "Update password"}
            </button>
          </form>

          <div className="text-sm leading-6 text-muted">
            <p>
              Need a new link?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-accent transition hover:text-accent-strong"
              >
                Request another reset email
              </Link>
            </p>
          </div>

          <SupportEscalationPanel
            body="If the reset link keeps failing or has already expired, request a new one first. If the problem continues, contact support with the email on the affected account."
            subject="TicketSystem reset link issue"
            title="Still not able to reset your password?"
          />
        </div>
      </Panel>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)]">
          <Panel>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
                Choose a new password
              </p>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                Loading your secure reset page.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                We are preparing your reset link details now.
              </p>
            </div>
          </Panel>
          <Panel>
            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-muted">
              Loading reset form...
            </div>
          </Panel>
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
