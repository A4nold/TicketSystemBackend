import { SurfaceShell } from "@/components/product/surface-shell";

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SurfaceShell
      surface="organizer"
      title="Organizer operations"
      description="Event setup, staff coordination, and operational readiness build from this shell."
    >
      {children}
    </SurfaceShell>
  );
}
