import { SurfaceShell } from "@/components/product/surface-shell";

export default function ScannerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SurfaceShell
      surface="scanner"
      title="Scanner operations"
      description="High-contrast validation and degraded-mode recovery are reserved for this shell."
    >
      {children}
    </SurfaceShell>
  );
}
