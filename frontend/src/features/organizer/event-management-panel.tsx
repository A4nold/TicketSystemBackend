"use client";

import { useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { TicketIssueVisibilityPanel } from "@/features/operations/ticket-issue-visibility-panel";
import { ApiError } from "@/lib/api/client";
import {
  createOrganizerTicketType,
  getOrganizerEventBySlug,
  getOrganizerManageableEventIds,
  inviteOrganizerStaff,
  listOrganizerEvents,
  listOrganizerStaff,
  revokeOrganizerStaff,
  updateOrganizerEvent,
  updateOrganizerStaffRole,
  updateOrganizerTicketType,
  type CreateOrganizerEventPayload,
  type CreateTicketTypePayload,
} from "@/lib/organizer/events-client";

type EventFormState = {
  allowResale: boolean;
  description: string;
  endsAt: string;
  maxResalePrice: string;
  resaleEndsAt: string;
  resaleStartsAt: string;
  salesEndAt: string;
  salesStartAt: string;
  slug: string;
  startsAt: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  timezone: string;
  title: string;
  venueAddress: string;
  venueName: string;
};

type TicketTypeFormState = {
  currency: string;
  description: string;
  isActive: boolean;
  maxPerOrder: string;
  name: string;
  price: string;
  quantity: string;
  saleEndsAt: string;
  saleStartsAt: string;
  sortOrder: string;
};

function toLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function toEventFormState(event: Awaited<ReturnType<typeof getOrganizerEventBySlug>>): EventFormState {
  return {
    allowResale: event.allowResale,
    description: event.description ?? "",
    endsAt: toLocalDateTime(event.endsAt),
    maxResalePrice: event.resalePolicy.maxResalePrice ?? "",
    resaleEndsAt: toLocalDateTime(event.resalePolicy.endsAt),
    resaleStartsAt: toLocalDateTime(event.resalePolicy.startsAt),
    salesEndAt: toLocalDateTime(event.salesWindow.endsAt),
    salesStartAt: toLocalDateTime(event.salesWindow.startsAt),
    slug: event.slug,
    startsAt: toLocalDateTime(event.startsAt),
    status: event.status as EventFormState["status"],
    timezone: event.timezone,
    title: event.title,
    venueAddress: event.venueAddress ?? "",
    venueName: event.venueName ?? "",
  };
}

function blankTicketTypeForm(): TicketTypeFormState {
  return {
    currency: "EUR",
    description: "",
    isActive: true,
    maxPerOrder: "",
    name: "",
    price: "",
    quantity: "",
    saleEndsAt: "",
    saleStartsAt: "",
    sortOrder: "0",
  };
}

function toTicketTypeFormState(ticketType: {
  currency: string;
  description: string | null;
  isActive: boolean;
  maxPerOrder: number | null;
  name: string;
  price: string;
  quantity: number;
  saleEndsAt?: string | null;
  saleStartsAt?: string | null;
}): TicketTypeFormState {
  return {
    currency: ticketType.currency,
    description: ticketType.description ?? "",
    isActive: ticketType.isActive,
    maxPerOrder: ticketType.maxPerOrder ? String(ticketType.maxPerOrder) : "",
    name: ticketType.name,
    price: ticketType.price,
    quantity: String(ticketType.quantity),
    saleEndsAt: toLocalDateTime(ticketType.saleEndsAt ?? null),
    saleStartsAt: toLocalDateTime(ticketType.saleStartsAt ?? null),
    sortOrder: "0",
  };
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

function formatReadinessDate(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function updateEventFormField(
  eventId: string,
  currentForm: EventFormState,
  setEventFormState: Dispatch<SetStateAction<{ eventId: string; form: EventFormState } | null>>,
  patch: Partial<EventFormState>,
) {
  setEventFormState({
    eventId,
    form: {
      ...currentForm,
      ...patch,
    },
  });
}

function updateTicketTypeFormField(
  draftKey: string,
  currentForm: TicketTypeFormState,
  setTicketTypeFormState: Dispatch<SetStateAction<{ key: string; form: TicketTypeFormState } | null>>,
  patch: Partial<TicketTypeFormState>,
) {
  setTicketTypeFormState({
    key: draftKey,
    form: {
      ...currentForm,
      ...patch,
    },
  });
}

type EventManagementPanelProps = Readonly<{
  refreshKey?: number;
}>;

export function EventManagementPanel({ refreshKey = 0 }: EventManagementPanelProps) {
  const { session } = useAuth();
  const organizerEventIds = useMemo(
    () => getOrganizerManageableEventIds(session?.user.memberships ?? []),
    [session?.user.memberships],
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventFormState, setEventFormState] = useState<{
    eventId: string;
    form: EventFormState;
  } | null>(null);
  const [ticketTypeFormState, setTicketTypeFormState] = useState<{
    key: string;
    form: TicketTypeFormState;
  } | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "SCANNER">("SCANNER");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eventsQuery = useQuery({
    queryFn: listOrganizerEvents,
    queryKey: ["organizer-events", refreshKey],
  });

  const manageableEvents = useMemo(
    () =>
      (eventsQuery.data ?? []).filter((event) => organizerEventIds.includes(event.id)),
    [eventsQuery.data, organizerEventIds],
  );
  const effectiveSelectedEventId = selectedEventId ?? manageableEvents[0]?.id ?? null;
  const selectedSummary =
    manageableEvents.find((event) => event.id === effectiveSelectedEventId) ?? null;

  const eventDetailQuery = useQuery({
    enabled: Boolean(selectedSummary),
    queryFn: () => getOrganizerEventBySlug(selectedSummary!.slug),
    queryKey: ["organizer-event-detail", selectedSummary?.slug],
  });
  const staffQuery = useQuery({
    enabled: Boolean(selectedSummary && session?.accessToken),
    queryFn: () => listOrganizerStaff(selectedSummary!.id, session!.accessToken),
    queryKey: ["organizer-staff", selectedSummary?.id, session?.accessToken],
  });
  const currentEventForm =
    eventDetailQuery.data && eventFormState?.eventId === eventDetailQuery.data.id
      ? eventFormState.form
      : eventDetailQuery.data
        ? toEventFormState(eventDetailQuery.data)
        : null;
  const effectiveSelectedTicketTypeId =
    eventDetailQuery.data?.ticketTypes.some((ticketType) => ticketType.id === selectedTicketTypeId)
      ? selectedTicketTypeId
      : eventDetailQuery.data?.ticketTypes[0]?.id ?? "";
  const currentTicketType = eventDetailQuery.data?.ticketTypes.find(
    (ticketType) => ticketType.id === effectiveSelectedTicketTypeId,
  );
  const ticketTypeDraftKey = effectiveSelectedTicketTypeId || `${selectedSummary?.id ?? "event"}-new`;
  const currentTicketTypeForm =
    ticketTypeFormState?.key === ticketTypeDraftKey
      ? ticketTypeFormState.form
      : currentTicketType
        ? toTicketTypeFormState(currentTicketType)
        : blankTicketTypeForm();
  const readinessItems = eventDetailQuery.data
    ? [
        {
          description:
            currentEventForm?.title &&
            currentEventForm.startsAt &&
            currentEventForm.timezone
              ? `Event details are present for ${eventDetailQuery.data.title}.`
              : "Core event identity or timing is still incomplete.",
          isReady: Boolean(
            currentEventForm?.title &&
              currentEventForm.startsAt &&
              currentEventForm.timezone,
          ),
          title: "Event details",
        },
        {
          description:
            eventDetailQuery.data.ticketTypes.length > 0
              ? `${eventDetailQuery.data.ticketTypes.length} ticket type${eventDetailQuery.data.ticketTypes.length === 1 ? "" : "s"} configured.`
              : "No ticket types configured yet.",
          isReady: eventDetailQuery.data.ticketTypes.length > 0,
          title: "Ticket types",
        },
        {
          description:
            currentEventForm?.allowResale
              ? currentEventForm.resaleStartsAt || currentEventForm.resaleEndsAt || currentEventForm.maxResalePrice
                ? "Resale rules are enabled and at least one operational boundary is configured."
                : "Resale is enabled, but no window or cap has been defined yet."
              : "Resale is disabled, which is valid if informal resale should remain blocked.",
          isReady:
            currentEventForm?.allowResale
              ? Boolean(
                  currentEventForm.resaleStartsAt ||
                    currentEventForm.resaleEndsAt ||
                    currentEventForm.maxResalePrice,
                )
              : true,
          title: "Resale policy",
        },
        {
          description:
            (staffQuery.data ?? []).some((membership) => membership.acceptedAt)
              ? `${(staffQuery.data ?? []).filter((membership) => membership.acceptedAt).length} accepted staff membership${(staffQuery.data ?? []).filter((membership) => membership.acceptedAt).length === 1 ? "" : "s"} available.`
              : "Only the owner is confirmed or no accepted operational staff are available yet.",
          isReady: (staffQuery.data ?? []).some(
            (membership) => membership.acceptedAt && membership.role !== "OWNER",
          ),
          title: "Staff coverage",
        },
      ]
    : [];
  const readinessCompleteCount = readinessItems.filter((item) => item.isReady).length;
  const readinessIsReady =
    readinessItems.length > 0 && readinessItems.every((item) => item.isReady);
  const readinessNextSteps = readinessItems.filter((item) => !item.isReady);

  function submitEventUpdate() {
    if (!session || !selectedSummary || !currentEventForm) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateOrganizerEvent(
          selectedSummary.id,
          {
            allowResale: currentEventForm.allowResale,
            description: currentEventForm.description || undefined,
            endsAt: toIsoDateTime(currentEventForm.endsAt),
            maxResalePrice: currentEventForm.maxResalePrice || undefined,
            resaleEndsAt: toIsoDateTime(currentEventForm.resaleEndsAt),
            resaleStartsAt: toIsoDateTime(currentEventForm.resaleStartsAt),
            salesEndAt: toIsoDateTime(currentEventForm.salesEndAt),
            salesStartAt: toIsoDateTime(currentEventForm.salesStartAt),
            slug: currentEventForm.slug || undefined,
            startsAt: new Date(currentEventForm.startsAt).toISOString(),
            status: currentEventForm.status,
            timezone: currentEventForm.timezone,
            title: currentEventForm.title,
            venueAddress: currentEventForm.venueAddress || undefined,
            venueName: currentEventForm.venueName || undefined,
          } satisfies Partial<CreateOrganizerEventPayload>,
          session.accessToken,
        );
        await Promise.all([eventsQuery.refetch(), eventDetailQuery.refetch()]);
        setNotice("Event details updated.");
      } catch (error) {
        setErrorMessage(getErrorText(error, "Event update could not be saved right now."));
      }
    });
  }

  function submitTicketType() {
    if (!session || !selectedSummary) {
      return;
    }

    const payload: CreateTicketTypePayload = {
      currency: currentTicketTypeForm.currency || "EUR",
      description: currentTicketTypeForm.description || undefined,
      isActive: currentTicketTypeForm.isActive,
      maxPerOrder: currentTicketTypeForm.maxPerOrder
        ? Number(currentTicketTypeForm.maxPerOrder)
        : undefined,
      name: currentTicketTypeForm.name,
      price: currentTicketTypeForm.price,
      quantity: Number(currentTicketTypeForm.quantity),
      saleEndsAt: toIsoDateTime(currentTicketTypeForm.saleEndsAt),
      saleStartsAt: toIsoDateTime(currentTicketTypeForm.saleStartsAt),
      sortOrder: currentTicketTypeForm.sortOrder
        ? Number(currentTicketTypeForm.sortOrder)
        : undefined,
    };

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        if (effectiveSelectedTicketTypeId) {
          await updateOrganizerTicketType(
            selectedSummary.id,
            effectiveSelectedTicketTypeId,
            payload,
            session.accessToken,
          );
          setNotice("Ticket type updated.");
        } else {
          const created = await createOrganizerTicketType(
            selectedSummary.id,
            payload,
            session.accessToken,
          );
          setSelectedTicketTypeId(created.id);
          setTicketTypeFormState(null);
          setNotice("Ticket type created.");
        }

        await Promise.all([eventsQuery.refetch(), eventDetailQuery.refetch()]);
      } catch (error) {
        setErrorMessage(
          getErrorText(error, "Ticket type changes could not be saved right now."),
        );
      }
    });
  }

  function submitResalePolicyUpdate() {
    if (!session || !selectedSummary || !currentEventForm) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateOrganizerEvent(
          selectedSummary.id,
          {
            allowResale: currentEventForm.allowResale,
            maxResalePrice: currentEventForm.maxResalePrice || undefined,
            resaleEndsAt: toIsoDateTime(currentEventForm.resaleEndsAt),
            resaleStartsAt: toIsoDateTime(currentEventForm.resaleStartsAt),
          },
          session.accessToken,
        );
        await Promise.all([eventsQuery.refetch(), eventDetailQuery.refetch()]);
        setNotice("Resale policy updated.");
      } catch (error) {
        setErrorMessage(
          getErrorText(error, "Resale policy could not be saved right now."),
        );
      }
    });
  }

  function submitStaffInvite() {
    if (!session || !selectedSummary) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await inviteOrganizerStaff(
          selectedSummary.id,
          {
            email: inviteEmail.trim(),
            role: inviteRole,
          },
          session.accessToken,
        );
        setInviteEmail("");
        await Promise.all([staffQuery.refetch(), eventDetailQuery.refetch()]);
        setNotice("Staff invite sent.");
      } catch (error) {
        setErrorMessage(getErrorText(error, "Staff invite could not be created right now."));
      }
    });
  }

  function changeStaffRole(membershipId: string, role: "ADMIN" | "SCANNER") {
    if (!session || !selectedSummary) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateOrganizerStaffRole(
          selectedSummary.id,
          membershipId,
          { role },
          session.accessToken,
        );
        await Promise.all([staffQuery.refetch(), eventDetailQuery.refetch()]);
        setNotice("Staff role updated.");
      } catch (error) {
        setErrorMessage(getErrorText(error, "Staff role could not be updated right now."));
      }
    });
  }

  function revokeStaffMembership(membershipId: string) {
    if (!session || !selectedSummary) {
      return;
    }

    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await revokeOrganizerStaff(selectedSummary.id, membershipId, session.accessToken);
        await Promise.all([staffQuery.refetch(), eventDetailQuery.refetch()]);
        setNotice("Staff access revoked.");
      } catch (error) {
        setErrorMessage(getErrorText(error, "Staff access could not be revoked right now."));
      }
    });
  }

  if (manageableEvents.length === 0 && !eventsQuery.isLoading) {
    return (
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
            Event management
          </p>
          <h2 className="font-display text-3xl">No organizer-owned events yet</h2>
          <p className="text-sm leading-6 text-muted">
            Create your first event above. Once an event exists, this area becomes the
            place to edit event details and manage ticket types.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
              Event management
            </p>
            <h2 className="font-display text-3xl">Edit event setup and ticket types</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Pick one of your organizer events, refine its operational details, and keep
              ticket type configuration close to the same workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {manageableEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  effectiveSelectedEventId === event.id
                    ? "border-accent-warm/60 bg-accent-warm/15 text-foreground"
                    : "border-border bg-white/8 text-muted hover:border-accent-warm/40 hover:bg-white/12"
                }`}
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {eventDetailQuery.isLoading || !currentEventForm ? (
        <Panel>
          <p className="text-sm leading-6 text-muted">Loading organizer event detail…</p>
        </Panel>
      ) : null}

      {currentEventForm && eventDetailQuery.data ? (
        <>
          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
                  Operational readiness
                </p>
                <h3 className="font-display text-3xl">
                  {readinessIsReady
                    ? "This event looks ready for the next operational stage"
                    : "This event still has setup gaps before it is fully ready"}
                </h3>
                <p className="text-sm leading-6 text-muted">
                  Readiness is derived from the latest event details, ticket types, staff
                  memberships, and resale policy already loaded for this event.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Ready areas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {readinessCompleteCount}/{readinessItems.length}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Issued tickets
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {eventDetailQuery.data.metrics.tickets}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Scan attempts
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {eventDetailQuery.data.metrics.scanAttempts}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Event start
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {formatReadinessDate(eventDetailQuery.data.startsAt)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {readinessItems.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-[1.2rem] border px-4 py-4 ${
                      item.isReady
                        ? "border-success/30 bg-success/10"
                        : "border-warning/30 bg-warning/8"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {item.isReady ? "Configured" : "Needs attention"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {readinessNextSteps.length > 0 ? (
                <div className="rounded-[1.2rem] border border-warning/30 bg-warning/8 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning">
                    Next setup areas
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {readinessNextSteps.map((item) => (
                      <span
                        key={item.title}
                        className="rounded-full border border-warning/30 px-4 py-2 text-sm font-semibold text-foreground"
                      >
                        {item.title}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-display text-3xl">Event details</h3>
                <p className="text-sm leading-6 text-muted">
                  Update the event identity, timing, venue, and publication state for{" "}
                  {eventDetailQuery.data.title}.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Title</span>
                  <input type="text" value={currentEventForm.title} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { title: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Slug</span>
                  <input type="text" value={currentEventForm.slug} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { slug: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Description</span>
                  <textarea value={currentEventForm.description} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { description: event.target.value })} rows={4} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Venue name</span>
                  <input type="text" value={currentEventForm.venueName} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { venueName: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Venue address</span>
                  <input type="text" value={currentEventForm.venueAddress} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { venueAddress: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Timezone</span>
                  <input type="text" value={currentEventForm.timezone} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { timezone: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Status</span>
                  <select value={currentEventForm.status} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { status: event.target.value as EventFormState["status"] })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Starts at</span>
                  <input type="datetime-local" value={currentEventForm.startsAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { startsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Ends at</span>
                  <input type="datetime-local" value={currentEventForm.endsAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { endsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Sales start</span>
                  <input type="datetime-local" value={currentEventForm.salesStartAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { salesStartAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Sales end</span>
                  <input type="datetime-local" value={currentEventForm.salesEndAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { salesEndAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
              </div>

              <button type="button" onClick={submitEventUpdate} disabled={isPending} className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65">
                {isPending ? "Saving event..." : "Save event details"}
              </button>
            </div>
          </Panel>

          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-display text-3xl">Staff access</h3>
                <p className="text-sm leading-6 text-muted">
                  Invite admins or scanner staff, track pending invites, and update
                  non-owner roles as event operations evolve.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.6fr_auto]">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Invite email</span>
                  <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="scanner@campusnight.ie" className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Role</span>
                  <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "SCANNER")} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50">
                    <option value="SCANNER">Scanner</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={submitStaffInvite} disabled={isPending} className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65">
                    {isPending ? "Sending invite..." : "Invite staff"}
                  </button>
                </div>
              </div>

              {staffQuery.isLoading ? (
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
                  Loading staff memberships…
                </div>
              ) : null}

              {staffQuery.data?.length ? (
                <div className="space-y-3">
                  {staffQuery.data.map((membership) => (
                    <div
                      key={membership.id}
                      className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {membership.user.firstName ?? membership.user.email}
                          </p>
                          <p className="text-sm text-muted">{membership.user.email}</p>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-warm">
                            {membership.acceptedAt ? "Accepted" : "Pending"} · {membership.role}
                          </p>
                        </div>

                        {membership.role !== "OWNER" ? (
                          <div className="flex flex-wrap gap-3">
                            <select
                              value={membership.role}
                              onChange={(event) => changeStaffRole(membership.id, event.target.value as "ADMIN" | "SCANNER")}
                              className="rounded-full border border-border bg-white/8 px-4 py-2 text-sm text-foreground outline-hidden transition hover:border-accent-warm/40"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="SCANNER">Scanner</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => revokeStaffMembership(membership.id)}
                              className="inline-flex rounded-full border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/15"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-full border border-border bg-white/8 px-4 py-2 text-sm font-semibold text-muted">
                            Owner protected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
                  No additional staff memberships yet for this event.
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-display text-3xl">Resale policy</h3>
                <p className="text-sm leading-6 text-muted">
                  Control whether attendees can resell tickets, when resale opens and closes,
                  and whether a maximum resale price should cap secondary transfers.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Resale status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {currentEventForm.allowResale ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Opens
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {currentEventForm.resaleStartsAt
                      ? new Intl.DateTimeFormat("en-IE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(currentEventForm.resaleStartsAt))
                      : "No start set"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Closes
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {currentEventForm.resaleEndsAt
                      ? new Intl.DateTimeFormat("en-IE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(currentEventForm.resaleEndsAt))
                      : "No end set"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Price cap
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {currentEventForm.maxResalePrice
                      ? `${currentEventForm.maxResalePrice} EUR`
                      : "No cap set"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-border bg-black/10 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={currentEventForm.allowResale} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { allowResale: event.target.checked })} className="h-4 w-4 rounded border-border bg-black/20" />
                  <span className="text-sm font-medium text-foreground">
                    Enable organizer-controlled resale
                  </span>
                </label>

                <p className="text-sm leading-6 text-muted">
                  When resale is enabled, attendee resale eligibility is still governed by
                  ticket state and this event&apos;s active resale window. Use the window and
                  cap below to define the operational boundaries clearly.
                </p>

                <div className="grid gap-5 lg:grid-cols-3">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Resale start</span>
                    <input type="datetime-local" value={currentEventForm.resaleStartsAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { resaleStartsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Resale end</span>
                    <input type="datetime-local" value={currentEventForm.resaleEndsAt} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { resaleEndsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Max resale price</span>
                    <input type="text" value={currentEventForm.maxResalePrice} onChange={(event) => updateEventFormField(eventDetailQuery.data.id, currentEventForm, setEventFormState, { maxResalePrice: event.target.value })} placeholder="25.00" className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                  </label>
                </div>

                <button type="button" onClick={submitResalePolicyUpdate} disabled={isPending} className="inline-flex rounded-full border border-accent-warm/50 bg-accent-warm/12 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent-warm/70 hover:bg-accent-warm/18 disabled:cursor-not-allowed disabled:opacity-65">
                  {isPending ? "Saving resale policy..." : "Save resale policy"}
                </button>
              </div>
            </div>
          </Panel>

          {session ? (
            <TicketIssueVisibilityPanel
              accessToken={session.accessToken}
              eventId={eventDetailQuery.data.id}
              mode="organizer"
            />
          ) : null}

          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-display text-3xl">Ticket type management</h3>
                <p className="text-sm leading-6 text-muted">
                  Create the first ticket type for this event or refine an existing one.
                </p>
              </div>

              {eventDetailQuery.data.ticketTypes.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {eventDetailQuery.data.ticketTypes.map((ticketType) => (
                    <button
                      key={ticketType.id}
                      type="button"
                      onClick={() => setSelectedTicketTypeId(ticketType.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        effectiveSelectedTicketTypeId === ticketType.id
                          ? "border-accent-warm/60 bg-accent-warm/15 text-foreground"
                          : "border-border bg-white/8 text-muted hover:border-accent-warm/40 hover:bg-white/12"
                      }`}
                    >
                      {ticketType.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketTypeId("");
                      setTicketTypeFormState({
                        key: `${eventDetailQuery.data.id}-new`,
                        form: blankTicketTypeForm(),
                      });
                    }}
                    className="rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent-warm/40 hover:bg-white/12"
                  >
                    New ticket type
                  </button>
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Name</span>
                  <input type="text" value={currentTicketTypeForm.name} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { name: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Price</span>
                  <input type="text" value={currentTicketTypeForm.price} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { price: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Description</span>
                  <textarea value={currentTicketTypeForm.description} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { description: event.target.value })} rows={3} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Quantity</span>
                  <input type="number" min="1" value={currentTicketTypeForm.quantity} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { quantity: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Max per order</span>
                  <input type="number" min="1" value={currentTicketTypeForm.maxPerOrder} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { maxPerOrder: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Currency</span>
                  <input type="text" value={currentTicketTypeForm.currency} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { currency: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Sort order</span>
                  <input type="number" min="0" value={currentTicketTypeForm.sortOrder} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { sortOrder: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Sale start</span>
                  <input type="datetime-local" value={currentTicketTypeForm.saleStartsAt} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { saleStartsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Sale end</span>
                  <input type="datetime-local" value={currentTicketTypeForm.saleEndsAt} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { saleEndsAt: event.target.value })} className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50" />
                </label>
                <label className="flex items-center gap-3 lg:col-span-2">
                  <input type="checkbox" checked={currentTicketTypeForm.isActive} onChange={(event) => updateTicketTypeFormField(ticketTypeDraftKey, currentTicketTypeForm, setTicketTypeFormState, { isActive: event.target.checked })} className="h-4 w-4 rounded border-border bg-black/20" />
                  <span className="text-sm font-medium text-foreground">Ticket type is active</span>
                </label>
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

              <button type="button" onClick={submitTicketType} disabled={isPending} className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65">
                {isPending
                  ? effectiveSelectedTicketTypeId
                    ? "Saving ticket type..."
                    : "Creating ticket type..."
                  : effectiveSelectedTicketTypeId
                    ? "Save ticket type"
                    : "Create ticket type"}
              </button>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
