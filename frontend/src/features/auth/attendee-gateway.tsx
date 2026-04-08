"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";

type AttendeeGatewayProps = Readonly<{
  eventSlug?: string;
}>;

const attendeeMilestones = [
  "Story 2.x will drive ticket selection and checkout completion.",
  "Story 3.x will add the wallet, ticket detail, and QR presentation flows.",
];

export function AttendeeGateway({ eventSlug }: AttendeeGatewayProps) {
  const router = useRouter();
  const {
    clearNotice,
    notice,
    session,
    signOut,
  } = useAuth();
  const nextPath = eventSlug ? `/tickets?eventSlug=${eventSlug}` : "/tickets";
  const authHref = `/auth?mode=login&next=${encodeURIComponent(
    nextPath,
  )}${eventSlug ? `&eventSlug=${encodeURIComponent(eventSlug)}` : ""}`;

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <div className="space-y-6">
        <Panel>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Attendee surface
            </p>
            <h1 className="font-display text-3xl">
              Welcome back, {session?.user.firstName ?? "attendee"}.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Your attendee session is active and can now survive a return to the
              app. Wallet, checkout, and broader route protection land in the next stories.
            </p>
          </div>
        </Panel>

        {notice ? (
          <Panel className="border-success/30 bg-success/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-success">{notice}</p>
              <button
                type="button"
                onClick={clearNotice}
                className="inline-flex rounded-full border border-success/35 px-4 py-2 text-sm font-medium text-success transition hover:bg-success/10"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        ) : null}

        <Panel>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
            <div className="space-y-4">
              <h2 className="font-display text-2xl">Authenticated attendee context</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Email
                  </p>
                  <p className="mt-2 text-sm text-foreground">{session?.user.email}</p>
                </div>
                <div className="rounded-2xl border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Account status
                  </p>
                  <p className="mt-2 text-sm text-foreground">{session?.user.status}</p>
                </div>
              </div>
              {eventSlug ? (
                <p className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
                  Event context preserved:
                  {" "}
                  <span className="font-medium text-foreground">{eventSlug}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    signOut({
                      notice: "You signed out successfully. Sign in again to continue.",
                    });
                    router.push(authHref);
                  }}
                  className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                >
                  Sign out
                </button>
                <Link
                  href={eventSlug ? `/events/${eventSlug}` : "/"}
                  className="inline-flex rounded-full border border-border bg-black/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-black/20"
                >
                  Return to public view
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-xl">What lands next</h3>
              <ul className="space-y-3 text-sm leading-6 text-muted">
                {attendeeMilestones.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border bg-black/10 px-4 py-3"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </ProtectedSurfaceGate>
  );
}
