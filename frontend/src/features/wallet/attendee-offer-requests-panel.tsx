"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { listMyTicketOffers } from "@/lib/offers/offers-client";

export function AttendeeOfferRequestsPanel() {
  const { session } = useAuth();
  const offersQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listMyTicketOffers(session!.accessToken),
    queryKey: ["attendee-offers", session?.accessToken],
    retry: 1,
  });

  if (!offersQuery.data?.length) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-border bg-surface-elevated p-5">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Offer requests</p>
      <div className="space-y-2">
        {offersQuery.data.slice(0, 4).map((offer) => (
          <div key={offer.id} className="rounded-2xl border border-border bg-black/10 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {offer.ticketType.name}: {offer.offeredPrice} {offer.currency}
            </p>
            <p className="text-muted">Status: {offer.status.toLowerCase()}</p>
            {offer.status === "ACCEPTED" ? (
              <p className="mt-1 text-xs text-muted">
                Open your notifications and use the accepted-offer checkout link.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
