import Link from "next/link";

type PublicHomeHeroProps = Readonly<{
  proofPoints: string[];
  spotlightStats: Array<{
    label: string;
    value: string;
  }>;
}>;

export function PublicHomeHero({
  proofPoints,
  spotlightStats,
}: PublicHomeHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,125,93,0.18),rgba(54,216,202,0.12),rgba(8,17,31,0.8))] px-6 py-8 shadow-[0_24px_90px_rgba(2,8,20,0.34)] sm:px-8 sm:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(54,216,202,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,125,93,0.16),transparent_28%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)] lg:items-end">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Live event marketplace
          </p>
          <div className="space-y-4">
            <h1 className="max-w-4xl font-display text-4xl leading-tight text-balance sm:text-5xl lg:text-6xl">
              Discover upcoming events, secure your ticket, and keep every pass in one wallet.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Built for modern event buying, with protected ownership, transfer-aware delivery, and a resale layer that still feels like part of the same product.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/events"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
            >
              Browse upcoming events
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/12"
            >
              Explore resale marketplace
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <span
                key={point}
                className="rounded-full border border-white/12 bg-black/15 px-3 py-1.5 text-sm text-slate-100"
              >
                {point}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {spotlightStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[1.4rem] border border-white/12 bg-black/15 p-4 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-accent-warm">
                {stat.label}
              </p>
              <p className="mt-2 text-base leading-6 text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
