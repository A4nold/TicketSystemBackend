"use client";

type ScannerEvent = {
  description: string | null;
  id: string;
  startsAt: string;
  status: string;
  ticketTypes: Array<{ id: string; name: string }>;
  title: string;
  venueName: string | null;
};

type ScannerMembership = {
  acceptedAt: string | null;
  eventId: string;
  id: string;
  role: "OWNER" | "ADMIN" | "SCANNER";
};

type Props = {
  accessibleEvents: ScannerEvent[];
  formatDateTime: (value: string) => string;
  formatScannerRole: (role: "OWNER" | "ADMIN" | "SCANNER") => string;
  selectedEventId: string | null;
  selectedMemberships: ScannerMembership[];
  onSelectEvent: (eventId: string) => void;
};

export function ScannerEventSelectorPanel({
  accessibleEvents,
  formatDateTime,
  formatScannerRole,
  selectedEventId,
  selectedMemberships,
  onSelectEvent,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted">
          Assigned events
        </p>
        <h2 className="font-display text-2xl">Pick the active door context</h2>
      </div>

      <div className="space-y-3">
        {accessibleEvents.map((event) => {
          const isSelected = event.id === selectedEventId;
          const membership = selectedMemberships.find(
            (candidate) => candidate.eventId === event.id && candidate.acceptedAt,
          );

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event.id)}
              className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-success/40 bg-success/10"
                  : "border-border bg-black/10 hover:border-success/30 hover:bg-black/15"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      {membership ? formatScannerRole(membership.role) : "Assigned event"}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {event.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/80">
                    {event.status}
                  </span>
                </div>

                <p className="text-sm leading-6 text-muted">
                  {event.venueName ?? "Venue pending"} · {formatDateTime(event.startsAt)}
                </p>
                <p className="text-sm text-muted">
                  {event.ticketTypes.length} ticket types configured
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
