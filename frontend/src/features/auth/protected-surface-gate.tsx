"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import {
  canAccessSurface,
  getDefaultSurfacePath,
} from "@/lib/auth/role-access";
import type { AppSurface } from "@/lib/auth/types";

type ProtectedSurfaceGateProps = Readonly<{
  children: React.ReactNode;
  nextPath: string;
  requiredSurface: Exclude<AppSurface, "public">;
}>;

function getSurfaceLabel(surface: Exclude<AppSurface, "public">) {
  switch (surface) {
    case "attendee":
      return "attendee";
    case "organizer":
      return "organizer";
    case "scanner":
      return "scanner";
  }
}

export function ProtectedSurfaceGate({
  children,
  nextPath,
  requiredSurface,
}: ProtectedSurfaceGateProps) {
  const router = useRouter();
  const { clearNotice, isAuthenticated, isHydrating, notice, session } = useAuth();

  useEffect(() => {
    if (isHydrating || isAuthenticated) {
      return;
    }

    router.replace(`/auth?mode=login&next=${encodeURIComponent(nextPath)}`);
  }, [isAuthenticated, isHydrating, nextPath, router]);

  if (isHydrating) {
    return (
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Checking access
          </p>
          <h1 className="font-display text-3xl">Restoring your access</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            We are confirming your current session before opening this surface.
          </p>
        </div>
      </Panel>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <Panel>
        <div className="space-y-4">
          <h1 className="font-display text-3xl">Redirecting to sign-in</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            This surface requires an authenticated session. If the redirect does
            not happen automatically, continue manually below.
          </p>
          <Link
            href={`/auth?mode=login&next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
          >
            Go to sign-in
          </Link>
        </div>
      </Panel>
    );
  }

  if (!canAccessSurface(session, requiredSurface)) {
    const defaultPath = getDefaultSurfacePath(session);

    return (
      <div className="space-y-6">
        {notice ? (
          <Panel className="border-warning/30 bg-warning/8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-warning">{notice}</p>
              <button
                type="button"
                onClick={clearNotice}
                className="inline-flex rounded-full border border-warning/35 px-4 py-2 text-sm font-medium text-warning transition hover:bg-warning/10"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        ) : null}

        <Panel>
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
              Access denied
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-3xl">
                This account cannot open the {getSurfaceLabel(requiredSurface)} surface.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Your current session is active, but it does not include access to
                this area. You can continue in the surface that matches your
                available permissions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={defaultPath}
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
              >
                Go to my surface
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Back to public home
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return <>{children}</>;
}
