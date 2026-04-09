"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { getCurrentAttendee } from "@/lib/auth/auth-client";
import { ApiError } from "@/lib/api/client";
import {
  acceptOrganizerStaffInvite,
  listOrganizerEvents,
} from "@/lib/organizer/events-client";
import { Panel } from "@/components/ui/panel";

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Staff invite could not be accepted right now. Please try again.";
}

export function PendingStaffInvitesPanel() {
  const { session, setSession } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingMemberships = useMemo(
    () => (session?.user.memberships ?? []).filter((membership) => !membership.acceptedAt),
    [session?.user.memberships],
  );

  const eventsQuery = useQuery({
    enabled: pendingMemberships.length > 0,
    queryFn: listOrganizerEvents,
    queryKey: ["pending-staff-invite-events"],
  });

  const inviteCards = pendingMemberships.map((membership) => {
    const event = eventsQuery.data?.find((candidate) => candidate.id === membership.eventId);

    return {
      eventId: membership.eventId,
      role: membership.role,
      title: event?.title ?? "Event access invitation",
    };
  });

  function acceptInvite(eventId: string) {
    if (!session) {
      return;
    }

    setErrorMessage(null);
    setNotice(null);
    setPendingEventId(eventId);

    startTransition(async () => {
      try {
        await acceptOrganizerStaffInvite(eventId, session.accessToken);
        const hydratedUser = await getCurrentAttendee(session.accessToken);
        setSession({
          ...session,
          user: hydratedUser,
        });
        setNotice("Staff invite accepted. Your updated organizer or scanner access is now active.");
      } catch (error) {
        setErrorMessage(getErrorText(error));
      } finally {
        setPendingEventId(null);
      }
    });
  }

  if (inviteCards.length === 0) {
    return null;
  }

  return (
    <Panel className="border-accent-warm/30 bg-accent-warm/8">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Pending staff invites
          </p>
          <h2 className="font-display text-3xl">You have event operations invites to accept</h2>
          <p className="max-w-3xl text-sm leading-6 text-foreground/85">
            Accepting an invite upgrades your account access for the specific event. You can
            still keep using your attendee wallet normally.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {inviteCards.map((invite) => (
            <div
              key={`${invite.eventId}-${invite.role}`}
              className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Pending role
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {invite.role}
              </p>
              <p className="mt-1 text-sm text-muted">{invite.title}</p>
              <button
                type="button"
                onClick={() => acceptInvite(invite.eventId)}
                disabled={isPending && pendingEventId === invite.eventId}
                className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isPending && pendingEventId === invite.eventId
                  ? "Accepting invite..."
                  : "Accept invite"}
              </button>
            </div>
          ))}
        </div>

        {notice ? (
          <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
            {notice}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
