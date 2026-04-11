"use client";

import type { ScannerAttemptRecord } from "./scanner-workspace.types";

type Props = {
  degradedMode: boolean;
  formatDateTime: (value: string) => string;
  latestOutcome: ScannerAttemptRecord | null;
  outcomeExplanation: string;
  outcomeHeading: string;
  outcomeTone: "success" | "accent" | "danger" | null;
};

export function ScannerOutcomePanel({
  degradedMode,
  formatDateTime,
  latestOutcome,
  outcomeExplanation,
  outcomeHeading,
  outcomeTone,
}: Props) {
  return (
    <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Recent outcome
          </p>
          <h3 className="font-display text-2xl">{outcomeHeading}</h3>
        </div>

        {latestOutcome ? (
          <div
            className={`rounded-[1.2rem] border px-4 py-4 ${
              outcomeTone === "success"
                ? "border-success/30 bg-success/10"
                : outcomeTone === "accent"
                  ? "border-accent-warm/30 bg-accent-warm/10"
                  : "border-danger/30 bg-danger/10"
            }`}
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/75">
                {latestOutcome.outcome.replaceAll("_", " ")} ·{" "}
                {latestOutcome.source === "DEGRADED" ? "Degraded mode" : "Live"}
              </p>
              <p className="text-base font-semibold text-foreground">
                {outcomeExplanation}
              </p>
              <p className="text-sm text-foreground/80">
                Serial: {latestOutcome.serialNumber ?? "Unavailable"} · Status:{" "}
                {latestOutcome.currentStatus ?? "Unknown"} ·{" "}
                {formatDateTime(latestOutcome.scannedAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
            Run a scan to see the live or degraded scanner result here.
          </div>
        )}

        <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
          {degradedMode
            ? "Degraded mode avoids overstating confidence: the result is guidance from the last manifest, not authoritative live truth."
            : "Each live result is phrased explicitly so door staff do not have to rely on color alone to decide whether entry should proceed."}
        </div>
      </div>
    </div>
  );
}
