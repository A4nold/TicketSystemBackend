"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { getCurrentAttendee } from "@/lib/auth/auth-client";
import {
  createOrganizerEvent,
  type OrganizerEventResponse,
} from "@/lib/organizer/events-client";

const eventSchema = z.object({
  allowResale: z.boolean(),
  description: z.string().max(2000).optional(),
  endsAt: z.string().optional(),
  maxResalePrice: z.string().optional(),
  minResalePrice: z.string().optional(),
  postEventCtaLabel: z.string().optional(),
  postEventCtaUrl: z.string().optional(),
  postEventMessage: z.string().optional(),
  postEventPublishedAt: z.string().optional(),
  resaleRoyaltyPercent: z.string().optional(),
  resaleEndsAt: z.string().optional(),
  resaleStartsAt: z.string().optional(),
  salesEndAt: z.string().optional(),
  salesStartAt: z.string().optional(),
  slug: z.string().max(160).optional(),
  startsAt: z.string().min(1, "Choose a start date and time."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  timezone: z.string().min(1, "Timezone is required."),
  title: z.string().trim().min(3, "Title must be at least 3 characters long.").max(160),
  venueAddress: z.string().max(240).optional(),
  venueName: z.string().max(160).optional(),
});

function toIsoDateTime(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Event could not be created right now. Please try again.";
}

const initialFormState: {
  allowResale: boolean;
  description: string;
  endsAt: string;
  maxResalePrice: string;
  minResalePrice: string;
  postEventCtaLabel: string;
  postEventCtaUrl: string;
  postEventMessage: string;
  postEventPublishedAt: string;
  resaleRoyaltyPercent: string;
  resaleEndsAt: string;
  resaleStartsAt: string;
  salesEndAt: string;
  salesStartAt: string;
  slug: string;
  startsAt: string;
  status: "DRAFT" | "PUBLISHED";
  timezone: string;
  title: string;
  venueAddress: string;
  venueName: string;
} = {
  allowResale: false,
  description: "",
  endsAt: "",
  maxResalePrice: "",
  minResalePrice: "",
  postEventCtaLabel: "",
  postEventCtaUrl: "",
  postEventMessage: "",
  postEventPublishedAt: "",
  resaleRoyaltyPercent: "",
  resaleEndsAt: "",
  resaleStartsAt: "",
  salesEndAt: "",
  salesStartAt: "",
  slug: "",
  startsAt: "",
  status: "DRAFT" as const,
  timezone: "Europe/Dublin",
  title: "",
  venueAddress: "",
  venueName: "",
};

type EventCreationFormProps = Readonly<{
  onCreated?: (eventId: string) => void;
}>;

export function EventCreationForm({ onCreated }: EventCreationFormProps) {
  const { session, setSession } = useAuth();
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<OrganizerEventResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<Key extends keyof typeof initialFormState>(
    key: Key,
    value: (typeof initialFormState)[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitEvent() {
    if (!session) {
      setErrorMessage("Your organizer session is unavailable. Sign in again to continue.");
      return;
    }

    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check the event details and try again.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const created = await createOrganizerEvent(
          {
            allowResale: parsed.data.allowResale,
            description: parsed.data.description || undefined,
            endsAt: toIsoDateTime(parsed.data.endsAt),
            maxResalePrice: parsed.data.maxResalePrice || undefined,
            minResalePrice: parsed.data.minResalePrice || undefined,
            postEventCtaLabel: parsed.data.postEventCtaLabel || undefined,
            postEventCtaUrl: parsed.data.postEventCtaUrl || undefined,
            postEventMessage: parsed.data.postEventMessage || undefined,
            postEventPublishedAt: toIsoDateTime(parsed.data.postEventPublishedAt),
            resaleRoyaltyPercent: parsed.data.resaleRoyaltyPercent || undefined,
            resaleEndsAt: toIsoDateTime(parsed.data.resaleEndsAt),
            resaleStartsAt: toIsoDateTime(parsed.data.resaleStartsAt),
            salesEndAt: toIsoDateTime(parsed.data.salesEndAt),
            salesStartAt: toIsoDateTime(parsed.data.salesStartAt),
            slug: parsed.data.slug || undefined,
            startsAt: new Date(parsed.data.startsAt).toISOString(),
            status: parsed.data.status,
            timezone: parsed.data.timezone,
            title: parsed.data.title,
            venueAddress: parsed.data.venueAddress || undefined,
            venueName: parsed.data.venueName || undefined,
          },
          session.accessToken,
        );

        const refreshedUser = await getCurrentAttendee(session.accessToken);
        setSession({
          ...session,
          user: refreshedUser,
        });
        setCreatedEvent(created);
        setForm(initialFormState);
        onCreated?.(created.id);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
            Organizer event creation
          </p>
          <h1 className="font-display text-4xl">Create the event shell first</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">
            Start with the event identity, venue, timing, and resale policy. Ticket types,
            staff, and deeper readiness checks come next, so this screen stays focused on
            getting the event into the platform cleanly.
          </p>
        </div>
      </Panel>

      {createdEvent ? (
        <Panel className="border-success/30 bg-success/10">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
                Event created
              </p>
              <h2 className="font-display text-3xl text-foreground">
                {createdEvent.title} is now in your organizer workspace.
              </h2>
              <p className="text-sm leading-6 text-foreground/85">
                The event exists now, but it is not fully configured yet. Your next steps
                are ticket types, staff access, and operational readiness.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Slug
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {createdEvent.slug}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Status
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {createdEvent.status.replaceAll("_", " ")}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Starts
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {formatDateTime(createdEvent.startsAt)}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Resale
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {createdEvent.allowResale ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/events/${createdEvent.slug}`}
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
              >
                View public event page
              </Link>
              <button
                type="button"
                onClick={() => setCreatedEvent(null)}
                className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Create another event
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Event title
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Campus Neon Takeover"
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Optional slug
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              placeholder="campus-neon-takeover"
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
              placeholder="Private student event with fraud-resistant smart ticketing."
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Venue name
            </span>
            <input
              type="text"
              value={form.venueName}
              onChange={(event) => updateField("venueName", event.target.value)}
              placeholder="The Dock Warehouse"
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Venue address
            </span>
            <input
              type="text"
              value={form.venueAddress}
              onChange={(event) => updateField("venueAddress", event.target.value)}
              placeholder="12 River Lane, Dublin"
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Timezone
            </span>
            <input
              type="text"
              value={form.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              placeholder="Europe/Dublin"
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Initial status
            </span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as "DRAFT" | "PUBLISHED")}
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Starts at
            </span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Ends at
            </span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => updateField("endsAt", event.target.value)}
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Sales start
            </span>
            <input
              type="datetime-local"
              value={form.salesStartAt}
              onChange={(event) => updateField("salesStartAt", event.target.value)}
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Sales end
            </span>
            <input
              type="datetime-local"
              value={form.salesEndAt}
              onChange={(event) => updateField("salesEndAt", event.target.value)}
              className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
            />
          </label>

          <div className="space-y-4 rounded-[1.5rem] border border-border bg-black/10 p-4 lg:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.allowResale}
                onChange={(event) => updateField("allowResale", event.target.checked)}
                className="h-4 w-4 rounded border-border bg-black/20"
              />
              <span className="text-sm font-medium text-foreground">
                Enable organizer-controlled resale
              </span>
            </label>

            <div className="grid gap-5 lg:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Resale start
                </span>
                <input
                  type="datetime-local"
                  value={form.resaleStartsAt}
                  onChange={(event) => updateField("resaleStartsAt", event.target.value)}
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Resale end
                </span>
                <input
                  type="datetime-local"
                  value={form.resaleEndsAt}
                  onChange={(event) => updateField("resaleEndsAt", event.target.value)}
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Min resale price
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.minResalePrice}
                  onChange={(event) => updateField("minResalePrice", event.target.value)}
                  placeholder="15.00"
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Max resale price
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.maxResalePrice}
                  onChange={(event) => updateField("maxResalePrice", event.target.value)}
                  placeholder="25.00"
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Organizer royalty %
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.resaleRoyaltyPercent}
                  onChange={(event) => updateField("resaleRoyaltyPercent", event.target.value)}
                  placeholder="10.00"
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-border bg-black/10 p-4 lg:col-span-2">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
                Post-event follow-up
              </p>
              <p className="text-sm leading-6 text-muted">
                Add an optional message and CTA that appears in attendee wallets after the event ends.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Post-event message
              </span>
              <textarea
                value={form.postEventMessage}
                onChange={(event) => updateField("postEventMessage", event.target.value)}
                rows={4}
                placeholder="Thanks for coming. Replay moments and early access are now live."
                className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
              />
            </label>

            <div className="grid gap-5 lg:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  CTA label
                </span>
                <input
                  type="text"
                  value={form.postEventCtaLabel}
                  onChange={(event) => updateField("postEventCtaLabel", event.target.value)}
                  placeholder="View replay"
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  CTA URL
                </span>
                <input
                  type="url"
                  value={form.postEventCtaUrl}
                  onChange={(event) => updateField("postEventCtaUrl", event.target.value)}
                  placeholder="https://example.com/replay"
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Publish at
                </span>
                <input
                  type="datetime-local"
                  value={form.postEventPublishedAt}
                  onChange={(event) => updateField("postEventPublishedAt", event.target.value)}
                  className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent-warm/50"
                />
              </label>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitEvent}
            disabled={isPending}
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isPending ? "Creating event..." : "Create event"}
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setCreatedEvent(null);
              setForm(initialFormState);
            }}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent-warm/50 hover:bg-white/12"
          >
            Reset form
          </button>
        </div>
      </Panel>
    </div>
  );
}
