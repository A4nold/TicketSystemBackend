import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { getSupportLabel, getSupportMailtoHref } from "@/lib/config/support";

export function SupportEscalationPanel({
  body,
  ctaLabel = "Email support",
  subject,
  title,
}: {
  body: string;
  ctaLabel?: string;
  subject?: string;
  title: string;
}) {
  return (
    <Panel className="border-border bg-black/10">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Need a hand?
          </p>
          <h3 className="font-display text-2xl text-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted">{body}</p>
        </div>

        <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
          Share the email on your account and, if you have it, the order id, ticket serial, or
          event name so the team can pick things up quickly.
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={getSupportMailtoHref(subject)}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
          >
            {ctaLabel}
          </Link>
          <span className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
            {getSupportLabel()}
          </span>
        </div>
      </div>
    </Panel>
  );
}
