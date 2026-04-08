"use client";

import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { getVisibleSurfaces } from "@/lib/auth/role-access";
import type { AppSurface } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type SurfaceKey = AppSurface;

type SurfaceShellProps = Readonly<{
  children: React.ReactNode;
  description: string;
  surface: SurfaceKey;
  title: string;
}>;

const navItems = [
  { href: "/", label: "Public", surface: "public" as const },
  { href: "/tickets", label: "Attendee", surface: "attendee" as const },
  { href: "/organizer", label: "Organizer", surface: "organizer" as const },
  { href: "/scanner", label: "Scanner", surface: "scanner" as const },
];

const surfaceAccentMap: Record<SurfaceKey, string> = {
  public: "text-accent",
  attendee: "text-accent",
  organizer: "text-accent-warm",
  scanner: "text-success",
};

export function SurfaceShell({
  children,
  description,
  surface,
  title,
}: SurfaceShellProps) {
  const { session } = useAuth();
  const visibleSurfaces = getVisibleSurfaces(session);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6">
          <Panel className="py-4">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-[0.28em]",
                    surfaceAccentMap[surface],
                  )}
                >
                  Private Event Smart Ticketing Platform
                </p>
                <div className="space-y-1">
                  <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted">
                    {description}
                  </p>
                </div>
              </div>

              <nav
                aria-label="Application surfaces"
                className="flex flex-wrap gap-2"
              >
                {navItems
                  .filter((item) => visibleSurfaces.includes(item.surface))
                  .map((item) => {
                  const isActive =
                    (surface === "public" && item.href === "/") ||
                    (surface === "attendee" && item.href === "/tickets") ||
                    (surface === "organizer" && item.href === "/organizer") ||
                    (surface === "scanner" && item.href === "/scanner");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition",
                        isActive
                          ? "border-transparent bg-white text-slate-950"
                          : "border-border bg-white/5 text-foreground hover:border-accent/50 hover:bg-white/8",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </Panel>
        </header>

        <main className="flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
