"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { SupportEscalationPanel } from "@/components/support/support-escalation-panel";
import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { getOrderById } from "@/lib/orders/orders-client";

type CheckoutReturnStatusProps = Readonly<{
  mode: "cancel" | "success";
  orderId?: string;
  sessionId?: string;
}>;

function getNextPath({
  mode,
  orderId,
  sessionId,
}: {
  mode: "cancel" | "success";
  orderId?: string;
  sessionId?: string;
}) {
  const search = new URLSearchParams();

  if (orderId) {
    search.set("orderId", orderId);
  }

  if (sessionId) {
    search.set("session_id", sessionId);
  }

  const suffix = search.toString();
  return `/checkout/${mode}${suffix ? `?${suffix}` : ""}`;
}

function getHeading(mode: "cancel" | "success") {
  return mode === "success"
    ? "Checking your payment result"
    : "Checkout did not complete";
}

function getIntro(mode: "cancel" | "success") {
  return mode === "success"
    ? "We are confirming the latest backend order state for this payment attempt."
    : "We are checking whether this checkout was cancelled, interrupted, or still needs confirmation.";
}

export function CheckoutReturnStatus({
  mode,
  orderId,
  sessionId,
}: CheckoutReturnStatusProps) {
  const { session } = useAuth();
  const nextPath = getNextPath({ mode, orderId, sessionId });

  const orderQuery = useQuery({
    enabled: Boolean(session?.accessToken && orderId),
    queryFn: () => getOrderById(orderId!, session!.accessToken),
    queryKey: ["checkout-return-order", orderId, session?.accessToken],
    retry: 1,
  });

  const order = orderQuery.data;
  const isLoading = orderQuery.isLoading || orderQuery.isFetching;
  const isSuccess = order?.status === "PAID";
  const isPending =
    order?.status === "PENDING" ||
    order?.isAwaitingPaymentConfirmation === true;
  const isCancelled = order?.status === "CANCELLED";
  const hasLookupError = orderQuery.isError || (!orderId && !isLoading);
  const hasIssuedTickets = (order?.tickets.length ?? 0) > 0;
  const attendeeHref = order ? `/wallet?recentOrderId=${encodeURIComponent(order.id)}` : "/wallet";

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <div className="space-y-6">
        <Panel>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Checkout completion
            </p>
            <h1 className="font-display text-3xl">{getHeading(mode)}</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {getIntro(mode)}
            </p>
          </div>
        </Panel>

        {isLoading ? (
          <Panel>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
                Refreshing backend truth
              </p>
              <p className="text-sm leading-6 text-muted">
                We are checking your order status so we can show the latest payment outcome.
              </p>
            </div>
          </Panel>
        ) : null}

        {!isLoading && isSuccess && order ? (
          <Panel className="border-success/30 bg-success/10">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
                  Payment confirmed
                </p>
                <h2 className="font-display text-3xl text-foreground">
                  Your order is paid.
                </h2>
                <p className="text-sm leading-6 text-foreground/85">
                  Order <span className="font-mono">{order.id}</span> is confirmed and ready
                  to continue into the attendee ticket flow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-success/20 bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Payment
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {order.paymentStatus ?? "paid"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Checkout state: {order.checkoutStatus ?? "complete"}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-success/20 bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Next step
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {hasIssuedTickets ? "Your tickets are now in your account" : "Ticket issuance is finalizing"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {hasIssuedTickets
                      ? "Use the attendee surface to reopen this recent purchase and keep moving toward entry."
                      : "Payment is complete, but backend ticket issuance has not appeared yet. Refresh before assuming anything is missing."}
                  </p>
                </div>
              </div>

              {hasIssuedTickets ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
                    Issued tickets
                  </p>
                  <div className="grid gap-3">
                    {order.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-[1.35rem] border border-success/20 bg-black/10 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                          Ticket serial
                        </p>
                        <p className="mt-2 font-mono text-sm text-foreground">
                          {ticket.serialNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Status: {ticket.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-warning/20 bg-black/10 p-4 text-sm leading-6 text-foreground/85">
                  Payment succeeded, but ticket issuance is still being finalized. Retry this
                  confirmation if the attendee surface does not reflect your purchase shortly.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href={attendeeHref}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                >
                  Continue to your wallet
                </Link>
                <button
                  type="button"
                  onClick={() => orderQuery.refetch()}
                  className="inline-flex rounded-full border border-success/30 bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/50 hover:bg-white/12"
                >
                  Refresh order state
                </button>
              </div>
            </div>
          </Panel>
        ) : null}

        {!isLoading && !isSuccess && isPending && order ? (
          <div className="space-y-4">
            <Panel className="border-warning/30 bg-warning/8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-warning">
                    Payment still confirming
                  </p>
                  <h2 className="font-display text-3xl text-foreground">
                    Your purchase is still being finalized.
                  </h2>
                  <p className="text-sm leading-6 text-foreground/85">
                    We found order <span className="font-mono">{order.id}</span>, but the backend
                    has not finalized payment yet. Ticket availability depends on final confirmation.
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-warning/20 bg-black/10 p-4 text-sm leading-6 text-muted">
                  Current payment state: {order.paymentStatus ?? "unknown"}.{" "}
                  Checkout state: {order.checkoutStatus ?? "unknown"}.
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => orderQuery.refetch()}
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                  >
                    Refresh payment status
                  </button>
                  <Link
                    href={attendeeHref}
                    className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                  >
                    Back to attendee surface
                  </Link>
                </div>
              </div>
            </Panel>
            <SupportEscalationPanel
              body={`If payment remains pending and the wallet still does not update, contact support with order ${order.id} before retrying multiple purchases.`}
              subject={`TicketSystem payment confirmation help for ${order.id}`}
              title="Need help with this order?"
            />
          </div>
        ) : null}

        {!isLoading && !isSuccess && !isPending && (isCancelled || mode === "cancel") ? (
          <div className="space-y-4">
            <Panel className="border-border bg-black/10">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-warm">
                    Checkout not completed
                  </p>
                  <h2 className="font-display text-3xl text-foreground">
                    No completed payment was recorded for this return.
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    {order
                      ? `Order ${order.id} is currently ${order.status.toLowerCase()}.`
                      : "This return path did not produce a confirmed paid order."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                  >
                    Return to public home
                  </Link>
                  <Link
                    href={attendeeHref}
                    className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                  >
                    Back to attendee surface
                  </Link>
                </div>
              </div>
            </Panel>
            <SupportEscalationPanel
              body="If you saw a bank or card charge but this return screen did not confirm payment, contact support before trying the same purchase again."
              subject="TicketSystem checkout return follow-up"
              title="Charge seen, but nothing in your wallet?"
            />
          </div>
        ) : null}

        {!isLoading && hasLookupError ? (
          <div className="space-y-4">
            <Panel className="border-danger/30 bg-danger/10">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-danger">
                    Could not confirm checkout result
                  </p>
                  <h2 className="font-display text-3xl text-foreground">
                    We could not load the latest order state.
                  </h2>
                  <p className="text-sm leading-6 text-foreground/85">
                    This can happen if the payment result is still settling or the network
                    request failed. Retry before assuming your tickets were issued.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => orderQuery.refetch()}
                    className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
                  >
                    Retry order lookup
                  </button>
                  <Link
                    href={attendeeHref}
                    className="inline-flex rounded-full border border-danger/30 bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-danger/50 hover:bg-white/12"
                  >
                    Go to attendee surface
                  </Link>
                </div>
              </div>
            </Panel>
            <SupportEscalationPanel
              body="If this confirmation screen still cannot recover the order state, contact support with any Stripe confirmation, order id, or event details you have."
              subject="TicketSystem checkout confirmation lookup failed"
              title="Still not seeing the latest order status?"
            />
          </div>
        ) : null}
      </div>
    </ProtectedSurfaceGate>
  );
}
