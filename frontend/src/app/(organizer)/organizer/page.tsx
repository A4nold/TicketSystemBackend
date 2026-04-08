import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";

const organizerMilestones = [
  "Event creation and editing",
  "Ticket-type and resale rule management",
  "Staff invitation and readiness review",
];

export default function OrganizerSurfacePage() {
  return (
    <ProtectedSurfaceGate requiredSurface="organizer" nextPath="/organizer">
      <div className="space-y-6">
        <Panel>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
              Organizer surface
            </p>
            <h1 className="font-display text-3xl">Operations shell prepared</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              This route group is reserved for organizer workflows and stays free
              of dashboard-heavy assumptions so later stories can shape the right
              operational tone.
            </p>
          </div>
        </Panel>

        <Panel>
          <div className="space-y-4">
            <h2 className="font-display text-2xl">Planned organizer capabilities</h2>
            <ul className="grid gap-3 text-sm leading-6 text-muted sm:grid-cols-3">
              {organizerMilestones.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-border bg-black/10 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </ProtectedSurfaceGate>
  );
}
