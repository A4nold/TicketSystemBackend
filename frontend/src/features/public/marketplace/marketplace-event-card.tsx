import Link from "next/link";

export type MarketplaceEventCardModel = {
  description: string;
  href: string;
  id: string;
  isSoon?: boolean;
  issuedTicketsCount: number;
  lowestPriceLabel: string;
  resaleLabel?: string;
  startLabel: string;
  statusLabel: string;
  title: string;
  venueLabel: string;
  organizerName?: string;
};

type MarketplaceEventCardProps = Readonly<{
  event: MarketplaceEventCardModel;
  featured?: boolean;
  hrefLabel?: string;
  secondaryLabel?: string;
}>;

export function MarketplaceEventCard({
  event,
  featured = false,
  hrefLabel = "View event",
  secondaryLabel,
}: MarketplaceEventCardProps) {
  return (
    <Link
      href={event.href}
      className={`group rounded-[1.6rem] border border-border bg-white/5 transition hover:border-accent/50 hover:bg-white/8 ${
        featured ? "p-6 md:p-7" : "p-5"
      }`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          {event.isSoon !== undefined ? (
            <span
              className={`rounded-full border px-3 py-1 ${
                event.isSoon
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-black/10 text-muted"
              }`}
            >
              {event.isSoon ? "Happening soon" : event.statusLabel}
            </span>
          ) : null}
          {event.resaleLabel ? (
            <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
              {event.resaleLabel}
            </span>
          ) : (
            <span className="rounded-full border border-border bg-black/10 px-3 py-1 text-muted">
              {event.statusLabel}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h3
            className={`font-display leading-tight text-foreground ${
              featured ? "text-3xl sm:text-4xl" : "text-2xl"
            }`}
          >
            {event.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {event.description}
          </p>
        </div>

        <dl className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">When</dt>
            <dd className="mt-2 text-foreground">{event.startLabel}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">Where</dt>
            <dd className="mt-2 text-foreground">{event.venueLabel}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-black/10 p-3">
            <dt className="text-xs uppercase tracking-[0.18em]">Tickets</dt>
            <dd className="mt-2 text-foreground">{event.lowestPriceLabel}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            {secondaryLabel ??
              `${event.issuedTicketsCount} tickets already issued${
                event.organizerName ? ` · ${event.organizerName}` : ""
              }`}
          </span>
          <span className="font-medium text-foreground transition group-hover:translate-x-1">
            {hrefLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}
