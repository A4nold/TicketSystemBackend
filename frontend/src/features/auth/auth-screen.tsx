"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportEscalationPanel } from "@/components/support/support-escalation-panel";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import {
  type LoginPayload,
  type RegisterPayload,
  getCurrentAttendee,
  loginAttendee,
  registerAttendee,
} from "@/lib/auth/auth-client";
import {
  canAccessSurface,
  getDefaultSurfacePath,
} from "@/lib/auth/role-access";
import type { AccountType, AuthSession, AppSurface } from "@/lib/auth/types";

type AuthMode = "login" | "register";

type AuthScreenProps = Readonly<{
  defaultMode: AuthMode;
  eventSlug?: string;
  nextPath: string;
}>;

const registerSchema = z.object({
  accountType: z.enum(["ATTENDEE", "ORGANIZER"]),
  email: z.email("Enter a valid email address."),
  firstName: z.string().max(80, "First name must be 80 characters or fewer.").optional(),
  lastName: z.string().max(80, "Last name must be 80 characters or fewer.").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must include uppercase, lowercase, and a number.",
    ),
  phoneNumber: z
    .string()
    .max(32, "Phone number must be 32 characters or fewer.")
    .optional(),
});

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must include uppercase, lowercase, and a number.",
    ),
});

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getSurfaceFromPath(path: string): AppSurface {
  if (path.startsWith("/organizer")) {
    return "organizer";
  }

  if (path.startsWith("/scanner")) {
    return "scanner";
  }

  if (path.startsWith("/tickets")) {
    return "attendee";
  }

  if (path.startsWith("/wallet")) {
    return "attendee";
  }

  return "public";
}

function getNextPathForSession(session: AuthSession, nextPath: string) {
  const requestedSurface = getSurfaceFromPath(nextPath);

  if (canAccessSurface(session, requestedSurface)) {
    return nextPath;
  }

  return getDefaultSurfacePath(session);
}

export function AuthScreen({
  defaultMode,
  eventSlug,
  nextPath,
}: AuthScreenProps) {
  const router = useRouter();
  const { clearNotice, notice, session, setSession } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registerValues, setRegisterValues] = useState({
    accountType: "ATTENDEE" as AccountType,
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phoneNumber: "",
  });
  const [loginValues, setLoginValues] = useState({
    email: "",
    password: "",
  });

  const summaryText = useMemo(() => {
    if (eventSlug) {
      return `You are continuing from the public event page for ${eventSlug}.`;
    }

    return "Create an attendee or organizer account, or sign in to continue into the right product surface.";
  }, [eventSlug]);

  const successText = session
    ? `Signed in as ${session.user.firstName ?? session.user.email}.`
    : notice;

  function handleRegisterChange(field: keyof typeof registerValues, value: string) {
    setRegisterValues((current) => ({
      ...current,
      [field]: field === "accountType" ? (value as AccountType) : value,
    }));
  }

  function handleLoginChange(field: keyof typeof loginValues, value: string) {
    setLoginValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submitRegister() {
    const parsed = registerSchema.safeParse({
      ...registerValues,
      firstName: registerValues.firstName || undefined,
      lastName: registerValues.lastName || undefined,
      phoneNumber: registerValues.phoneNumber || undefined,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check your registration details.");
      return;
    }

    setErrorMessage(null);
    clearNotice();
    startTransition(async () => {
      try {
        const response = await registerAttendee(parsed.data as RegisterPayload);
        const user = await getCurrentAttendee(response.accessToken);
        const hydratedSession = {
          ...response,
          user,
        };
        setSession(hydratedSession);
        router.push(getNextPathForSession(hydratedSession, nextPath));
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  function submitLogin() {
    const parsed = loginSchema.safeParse(loginValues);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check your sign-in details.");
      return;
    }

    setErrorMessage(null);
    clearNotice();
    startTransition(async () => {
      try {
        const response = await loginAttendee(parsed.data as LoginPayload);
        const user = await getCurrentAttendee(response.accessToken);
        const hydratedSession = {
          ...response,
          user,
        };
        setSession(hydratedSession);
        router.push(getNextPathForSession(hydratedSession, nextPath));
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,30rem)]">
      <Panel>
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Product authentication
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Create your account or sign back in.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {summaryText}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Purpose
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Identity-bound attendee access and organizer setup both start here.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                What is not here yet
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Checkout, wallet state, and session restoration arrive in later stories.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                After success
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                You will be routed into the product surface your account can actually access.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="space-y-5">
          <div className="flex gap-2 rounded-full border border-border bg-black/10 p-1">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-white text-slate-950"
                  : "text-foreground hover:bg-white/10"
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-white text-slate-950"
                  : "text-foreground hover:bg-white/10"
              }`}
            >
              Sign in
            </button>
          </div>

          {successText ? (
            <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {successText}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}

          {mode === "register" ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitRegister();
              }}
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Account type
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleRegisterChange("accountType", "ATTENDEE")}
                    className={`rounded-[1.2rem] border px-4 py-3 text-left transition ${
                      registerValues.accountType === "ATTENDEE"
                        ? "border-transparent bg-white text-slate-950"
                        : "border-border bg-black/10 text-foreground hover:border-accent/50"
                    }`}
                  >
                    <p className="text-sm font-semibold">Attendee</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      Buy tickets, manage your wallet, and accept staff invites later if needed.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegisterChange("accountType", "ORGANIZER")}
                    className={`rounded-[1.2rem] border px-4 py-3 text-left transition ${
                      registerValues.accountType === "ORGANIZER"
                        ? "border-transparent bg-white text-slate-950"
                        : "border-border bg-black/10 text-foreground hover:border-accent/50"
                    }`}
                  >
                    <p className="text-sm font-semibold">Organizer</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      Create your first event immediately and manage setup from the organizer surface.
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">First name</span>
                  <input
                    className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                    value={registerValues.firstName}
                    onChange={(event) =>
                      handleRegisterChange("firstName", event.target.value)
                    }
                    autoComplete="given-name"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Last name</span>
                  <input
                    className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                    value={registerValues.lastName}
                    onChange={(event) =>
                      handleRegisterChange("lastName", event.target.value)
                    }
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input
                  required
                  type="email"
                  className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                  value={registerValues.email}
                  onChange={(event) =>
                    handleRegisterChange("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Phone number</span>
                <input
                  className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                  value={registerValues.phoneNumber}
                  onChange={(event) =>
                    handleRegisterChange("phoneNumber", event.target.value)
                  }
                  autoComplete="tel"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Password</span>
                <input
                  required
                  type="password"
                  className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                  value={registerValues.password}
                  onChange={(event) =>
                    handleRegisterChange("password", event.target.value)
                  }
                  autoComplete="new-password"
                />
                <span className="block text-xs leading-5 text-muted">
                  Use at least 8 characters with uppercase, lowercase, and a number.
                </span>
              </label>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending
                  ? "Creating account..."
                  : registerValues.accountType === "ORGANIZER"
                    ? "Create organizer account"
                    : "Create attendee account"}
              </button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitLogin();
              }}
            >
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Email</span>
                <input
                  required
                  type="email"
                  className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                  value={loginValues.email}
                  onChange={(event) =>
                    handleLoginChange("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Password</span>
                <input
                  required
                  type="password"
                  className="w-full rounded-2xl border border-border bg-black/10 px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-black/20"
                  value={loginValues.password}
                  onChange={(event) =>
                    handleLoginChange("password", event.target.value)
                  }
                  autoComplete="current-password"
                />
              </label>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Lost access to your wallet?</span>
                <Link
                  href="/forgot-password"
                  className="font-medium text-accent transition hover:text-accent-strong"
                >
                  Reset password
                </Link>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <div className="text-sm leading-6 text-muted">
            <p>
              Next stop after auth:
              {" "}
              <span className="font-medium text-foreground">{nextPath}</span>
            </p>
            <p>
              Want to go back first?{" "}
              <Link
                href={eventSlug ? `/events/${eventSlug}` : "/"}
                className="font-medium text-accent transition hover:text-accent-strong"
              >
                Return to the public event view
              </Link>
            </p>
          </div>

          <SupportEscalationPanel
            body="If sign-in still fails after checking your password or using the reset flow, contact support so the team can review account status before your next event."
            subject="TicketSystem account access help"
            title="Still having trouble signing in?"
          />
        </div>
      </Panel>
    </div>
  );
}
