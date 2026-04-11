"use client";

import type { ScannerAttemptRecord } from "./scanner-workspace.types";

type Props = {
  formatDateTime: (value: string) => string;
  recentAttempts: ScannerAttemptRecord[];
};

export function ScannerRecentAttemptsPanel({
  formatDateTime,
  recentAttempts,
}: Props) {
  return (
    <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Recent attempts
          </p>
          <h3 className="font-display text-2xl">Scanner line continuity</h3>
        </div>

        {recentAttempts.length > 0 ? (
          <div className="space-y-3">
            {recentAttempts.map((attempt, index) => (
              <div
                key={`${attempt.scanSessionId ?? "session"}-${attempt.scannedAt}-${attempt.serialNumber ?? "unknown"}-${index}`}
                className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {attempt.outcome.replaceAll("_", " ")} ·{" "}
                      {attempt.serialNumber ?? "Unknown ticket"}
                    </p>
                    <p className="text-sm text-muted">
                      {attempt.reasonCode} · {attempt.currentStatus ?? "Unknown status"} ·{" "}
                      {attempt.source === "DEGRADED"
                        ? attempt.syncState === "SYNCED"
                          ? "Synced"
                          : "Pending sync"
                        : "Live"}
                    </p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {formatDateTime(attempt.scannedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
            Recent attempts will appear here after each validation so staff can move
            cleanly from one scan to the next.
          </div>
        )}
      </div>
    </div>
  );
}
