import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { OrganizerWorkspace } from "@/features/organizer/organizer-workspace";

export default function OrganizerSurfacePage() {
  return (
    <ProtectedSurfaceGate requiredSurface="organizer" nextPath="/organizer">
      <OrganizerWorkspace />
    </ProtectedSurfaceGate>
  );
}
