"use client";

import { Panel } from "@/components/ui/panel";

type WalletHeroPanelProps = Readonly<{
  attendeeFirstName?: string | null;
  notice: string | null;
  onDismissNotice: () => void;
}>;

export function WalletHeroPanel({
  attendeeFirstName,
  notice,
  onDismissNotice,
}: WalletHeroPanelProps) {
  return (
    <>
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Wallet
          </p>
          <h1 className="font-display text-3xl">
            Welcome back, {attendeeFirstName ?? "attendee"}.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Your account now centers on a live wallet view, so tickets, purchases,
            invites, and follow-up actions stay in one place after sign-in.
          </p>
        </div>
      </Panel>

      {notice ? (
        <Panel className="border-success/30 bg-success/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-success">{notice}</p>
            <button
              type="button"
              onClick={onDismissNotice}
              className="inline-flex rounded-full border border-success/35 px-4 py-2 text-sm font-medium text-success transition hover:bg-success/10"
            >
              Dismiss
            </button>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
