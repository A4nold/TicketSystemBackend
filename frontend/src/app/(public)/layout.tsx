import { SurfaceShell } from "@/components/product/surface-shell";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SurfaceShell
      surface="public"
      title="Public event access"
      description="SEO-aware entry surfaces and shareable event pages live here."
    >
      {children}
    </SurfaceShell>
  );
}
