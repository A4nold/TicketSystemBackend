import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { ScannerWorkspace } from "@/features/scanner/scanner-workspace";

export default function ScannerSurfacePage() {
  return (
    <ProtectedSurfaceGate requiredSurface="scanner" nextPath="/scanner">
      <ScannerWorkspace />
    </ProtectedSurfaceGate>
  );
}
