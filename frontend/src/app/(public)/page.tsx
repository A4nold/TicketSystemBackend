import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { getApiOriginLabel } from "@/lib/config/env";

const surfaceCards = [
  {
    href: "/tickets",
    label: "Attendee",
    title: "Ticket wallet and purchase flows",
    description:
      "Reserved for the mobile-first attendee experience, including owned tickets, checkout follow-through, and QR readiness.",
  },
  {
    href: "/organizer",
    label: "Organizer",
    title: "Event setup and operations",
    description:
      "Prepared for event creation, ticket-type control, staffing, and pre-event readiness workflows.",
  },
  {
    href: "/scanner",
    label: "Scanner",
    title: "High-clarity validation surface",
    description:
      "Prepared for fast scanner access, validation outcomes, and degraded-mode handling under venue conditions.",
  },
];

const featuredEventSlug = "campus-neon-takeover";

export default function PublicHomePage() {
  const apiOrigin = getApiOriginLabel();

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
            Foundation story complete
          </p>
          <div className="space-y-3">
            <h1 className="max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
              Private event ticketing now has a real frontend shell.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              This app is intentionally narrow: it proves the approved Next.js
              architecture, route separation, API configuration, and shared
              provider setup without prematurely implementing attendee,
              organizer, or scanner features.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded-full border border-border px-3 py-1">
              Next.js App Router
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              Tailwind CSS
            </span>
            <span className="rounded-full border border-border px-3 py-1">
              TanStack Query
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
        <Panel>
          <div className="space-y-4">
            <h2 className="font-display text-2xl">Prepared product surfaces</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {surfaceCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-[1.25rem] border border-border bg-white/5 p-5 transition hover:border-accent/55 hover:bg-white/8"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-warm">
                      {card.label}
                    </p>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {card.title}
                      </h3>
                      <p className="text-sm leading-6 text-muted">
                        {card.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      Open surface
                      <span
                        aria-hidden="true"
                        className="transition group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="space-y-4">
            <h2 className="font-display text-2xl">External system of record</h2>
            <p className="text-sm leading-6 text-muted">
              The frontend is configured as a pure web client. Backend truth
              stays in the existing NestJS API, exposed to this app through an
              environment-driven base URL.
            </p>
            <dl className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border bg-black/10 p-4">
                <dt className="font-medium text-muted">
                  Configured API origin
                </dt>
                <dd className="mt-2 break-all font-mono text-foreground">
                  {apiOrigin}
                </dd>
              </div>
              <div className="rounded-2xl border border-border bg-black/10 p-4">
                <dt className="font-medium text-muted">Featured public route</dt>
                <dd className="mt-2">
                  <Link
                    href={`/events/${featuredEventSlug}`}
                    className="font-medium text-accent transition hover:text-accent-strong"
                  >
                    /events/{featuredEventSlug}
                  </Link>
                </dd>
              </div>
              <div className="rounded-2xl border border-border bg-black/10 p-4">
                <dt className="font-medium text-muted">Next steps unlocked</dt>
                <dd className="mt-2 text-foreground">
                  Public event pages, attendee auth, and checkout can now land
                  on stable route and provider foundations.
                </dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>
    </div>
  );
}
