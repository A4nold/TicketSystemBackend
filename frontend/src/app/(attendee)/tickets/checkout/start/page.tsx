import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { CheckoutStartReview } from "@/features/checkout/checkout-start-review";
import { getPublicEventBySlug } from "@/features/events/public-event";

type CheckoutStartPageProps = {
  searchParams?: Promise<{
    eventSlug?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>;
};

function InvalidSelectionState() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-warm">
            Checkout unavailable
          </p>
          <h1 className="font-display text-3xl">This ticket selection is incomplete.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Start again from the event page so we can confirm the ticket type, quantity,
            and current availability before checkout begins.
          </p>
        </div>
      </Panel>

      <Link
        href="/"
        className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
      >
        Back to public home
      </Link>
    </div>
  );
}

export default async function CheckoutStartPage({
  searchParams,
}: CheckoutStartPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const eventSlug = resolved?.eventSlug;
  const ticketTypeId = resolved?.ticketTypeId;
  const quantity = Number(resolved?.quantity ?? "0");

  if (
    !eventSlug ||
    !ticketTypeId ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return <InvalidSelectionState />;
  }

  const event = await getPublicEventBySlug(eventSlug);
  const ticketType = event.ticketTypes.find((candidate) => candidate.id === ticketTypeId);

  if (!ticketType || !ticketType.isPurchasable) {
    return <InvalidSelectionState />;
  }

  const maxSelectable = Math.max(
    1,
    Math.min(ticketType.quantity, ticketType.maxPerOrder ?? ticketType.quantity),
  );

  if (quantity > maxSelectable) {
    return <InvalidSelectionState />;
  }

  const nextPath = `/tickets/checkout/start?eventSlug=${encodeURIComponent(eventSlug)}&ticketTypeId=${encodeURIComponent(ticketTypeId)}&quantity=${quantity}`;

  return (
    <CheckoutStartReview
      event={{
        slug: event.slug,
        startsAt: event.startsAt,
        timezone: event.timezone,
        title: event.title,
        venueLabel: event.venueLabel,
      }}
      nextPath={nextPath}
      selection={{
        maxPerOrder: ticketType.maxPerOrder,
        name: ticketType.name,
        priceLabel: ticketType.priceLabel,
        priceValue: ticketType.priceValue,
        quantity,
        quantityAvailable: ticketType.quantity,
        ticketTypeId: ticketType.id,
      }}
    />
  );
}
