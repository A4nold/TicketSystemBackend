import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";

const scannerMilestones = [
  "Scanner access and event context loading",
  "Immediate valid / used / invalid outcomes",
  "Degraded-mode visibility and recovery handling",
];

export default function ScannerSurfacePage() {
  return (
    <ProtectedSurfaceGate requiredSurface="scanner" nextPath="/scanner">
      <div className="space-y-6">
        <Panel className="border-success/30 bg-success/8">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-success">
              Scanner surface
            </p>
            <h1 className="font-display text-3xl">Entry validation shell prepared</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              This high-clarity route is ready for scanner authentication,
              manifest loading, and validation outcomes, while staying intentionally
              free of live scan logic in this foundation story.
            </p>
          </div>
        </Panel>

        <Panel>
          <div className="space-y-4">
            <h2 className="font-display text-2xl">Reserved scanner milestones</h2>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {scannerMilestones.map((item) => (
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
