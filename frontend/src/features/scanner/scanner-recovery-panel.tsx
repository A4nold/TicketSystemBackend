"use client";

import type { ScannerAttemptRecord } from "./scanner-workspace.types";

type Props = {
  degradedMode: boolean;
  isOnline: boolean;
  isSyncPending: boolean;
  pendingSyncAttempts: ScannerAttemptRecord[];
  onSync: () => void;
};

export function ScannerRecoveryPanel({
  degradedMode,
  isOnline,
  isSyncPending,
  pendingSyncAttempts,
  onSync,
}: Props) {
  return (
    <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Degraded recovery
            </p>
            <h3 className="font-display text-2xl">Queue and resync safely</h3>
            <p className="text-sm leading-6 text-muted">
              Attempts made without live connectivity are queued until you return to
              normal validation mode.
            </p>
          </div>
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncPending || degradedMode || pendingSyncAttempts.length === 0}
            className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/30 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSyncPending ? "Syncing queued attempts..." : "Sync queued attempts"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Connectivity
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Mode
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {degradedMode ? "Degraded" : "Live"}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Pending sync
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {pendingSyncAttempts.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
