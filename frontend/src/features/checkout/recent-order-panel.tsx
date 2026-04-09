"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { getOrderById } from "@/lib/orders/orders-client";

type RecentOrderPanelProps = Readonly<{
  orderId: string;
}>;

export function RecentOrderPanel({ orderId }: RecentOrderPanelProps) {
  const { session } = useAuth();
  const orderQuery = useQuery({
    enabled: Boolean(session?.accessToken && orderId),
    queryFn: () => getOrderById(orderId, session!.accessToken),
    queryKey: ["recent-order", orderId, session?.accessToken],
    retry: 1,
  });

  const order = orderQuery.data;

  if (orderQuery.isLoading || orderQuery.isFetching) {
    return (
      <Panel className="border-success/30 bg-success/10">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
            Recent purchase
          </p>
          <p className="text-sm leading-6 text-foreground/85">
            Refreshing your latest issued tickets from the backend.
          </p>
        </div>
      </Panel>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <Panel className="border-warning/30 bg-warning/8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-warning">
            Recent purchase not available
          </p>
          <p className="text-sm leading-6 text-foreground/85">
            We could not refresh your latest order summary. Use the checkout return page or
            refresh this surface again.
          </p>
        </div>
      </Panel>
    );
  }

  const hasIssuedTickets = order.tickets.length > 0;

  return (
    <Panel className="border-success/30 bg-success/10">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
            Recent purchase
          </p>
          <h2 className="font-display text-2xl text-foreground">
            {hasIssuedTickets
              ? "Your latest tickets are now in your account."
              : "Your order is paid and ticket issuance is still finalizing."}
          </h2>
          <p className="text-sm leading-6 text-foreground/85">
            Order <span className="font-mono">{order.id}</span> is{" "}
            {order.status.toLowerCase()}.
          </p>
        </div>

        {hasIssuedTickets ? (
          <div className="grid gap-3">
            {order.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-[1.25rem] border border-success/20 bg-black/10 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Issued ticket
                </p>
                <p className="mt-2 font-mono text-sm text-foreground">{ticket.serialNumber}</p>
                <p className="mt-1 text-sm text-muted">Status: {ticket.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-warning/20 bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
            Payment is complete, but the backend has not reflected issued tickets yet. Retry
            from the checkout success page if this does not update shortly.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/checkout/success?orderId=${encodeURIComponent(order.id)}`}
            className="inline-flex rounded-full border border-success/30 bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/50 hover:bg-white/12"
          >
            Reopen confirmation
          </Link>
          <button
            type="button"
            onClick={() => orderQuery.refetch()}
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
          >
            Refresh latest purchase
          </button>
        </div>
      </div>
    </Panel>
  );
}
