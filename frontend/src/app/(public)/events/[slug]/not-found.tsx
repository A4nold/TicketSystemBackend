import Link from "next/link";

import { Panel } from "@/components/ui/panel";

export default function EventNotFound() {
  return (
    <Panel className="mx-auto max-w-3xl">
      <div className="space-y-4 text-center sm:space-y-5">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
          Event unavailable
        </p>
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl">
            We could not find that event page.
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted sm:text-base">
            The event may have moved, the link may be incomplete, or the page is
            no longer being shared publicly.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-surface-soft"
        >
          Back to public access
        </Link>
      </div>
    </Panel>
  );
}
