import { SurfaceShell } from "@/components/product/surface-shell";

export default function AttendeeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SurfaceShell
      surface="attendee"
      title="Attendee app"
      description="Mobile-first ticket access, ownership, and QR readiness will build from this shell."
    >
      {children}
    </SurfaceShell>
  );
}
