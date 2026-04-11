"use client";

import Link from "next/link";

import { Panel } from "@/components/ui/panel";

type WalletAccountPanelProps = Readonly<{
  email?: string | null;
  eventSlug?: string;
  onSignOut: () => void;
  returnHref: string;
  status?: string | null;
}>;

export function WalletAccountPanel({
  email,
  eventSlug,
  onSignOut,
  returnHref,
  status,
}: WalletAccountPanelProps) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <h2 className="font-display text-2xl">Wallet overview</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Email
              </p>
              <p className="mt-2 text-sm text-foreground">{email}</p>
            </div>
            <div className="rounded-2xl border border-border bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Account status
              </p>
              <p className="mt-2 text-sm text-foreground">{status}</p>
            </div>
          </div>
          {eventSlug ? (
            <p className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
              Event context preserved:{" "}
              <span className="font-medium text-foreground">{eventSlug}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
          >
            Sign out
          </button>
          <Link
            href={returnHref}
            className="inline-flex rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-black/20"
          >
            Return to public view
          </Link>
        </div>
      </div>
    </Panel>
  );
}
