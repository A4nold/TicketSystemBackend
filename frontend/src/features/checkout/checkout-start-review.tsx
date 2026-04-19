"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Panel } from "@/components/ui/panel";
import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/components/providers/auth-provider";
import { createCheckoutOrder, getCheckoutQuote } from "@/lib/orders/orders-client";

type CheckoutStartReviewProps = Readonly<{
  event: {
    slug: string;
    startsAt: string;
    timezone: string;
    title: string;
    venueLabel: string;
  };
  nextPath: string;
  selection: {
    maxPerOrder: number | null;
    name: string;
    priceLabel: string;
    priceValue: number;
    quantity: number;
    quantityAvailable: number;
    ticketTypeId: string;
  };
}>;

function formatEventTime(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(date));
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Checkout could not start right now. Please try again.";
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value));
}

function describeFeePolicy(policy: {
  fixedAmount: string;
  fixedFeeApplication: "PER_ORDER" | "PER_TICKET";
  percentRate: string;
  responsibility: "BUYER" | "ORGANIZER";
}) {
  const percentLabel = `${(Number(policy.percentRate) * 100).toFixed(2)}%`;
  const fixedLabel = `+ EUR ${Number(policy.fixedAmount).toFixed(2)} ${
    policy.fixedFeeApplication === "PER_TICKET" ? "per ticket" : "per order"
  }`;

  return policy.responsibility === "BUYER"
    ? `${percentLabel} ${fixedLabel}, paid at checkout`
    : `${percentLabel} ${fixedLabel}, absorbed by the organizer`;
}

export function CheckoutStartReview({
  event,
  nextPath,
  selection,
}: CheckoutStartReviewProps) {
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `checkout-${crypto.randomUUID()}`;
    }

    return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  });

  const subtotalLabel = useMemo(() => {
    return new Intl.NumberFormat("en-IE", {
      currency: "EUR",
      maximumFractionDigits: 2,
      style: "currency",
    }).format(selection.priceValue * selection.quantity);
  }, [selection.priceValue, selection.quantity]);
  const quoteQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () =>
      getCheckoutQuote(
        {
          eventSlug: event.slug,
          items: [
            {
              quantity: selection.quantity,
              ticketTypeId: selection.ticketTypeId,
            },
          ],
          paymentProvider: "STRIPE",
        },
        session!.accessToken,
      ),
    queryKey: [
      "checkout-quote",
      event.slug,
      selection.quantity,
      selection.ticketTypeId,
      session?.accessToken,
    ],
    retry: 1,
  });

  function beginPayment() {
    if (!session) {
      setErrorMessage("Your attendee session is not available. Sign in again to continue.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const order = await createCheckoutOrder(
          {
            eventSlug: event.slug,
            idempotencyKey,
            items: [
              {
                quantity: selection.quantity,
                ticketTypeId: selection.ticketTypeId,
              },
            ],
            paymentProvider: "STRIPE",
          },
          session.accessToken,
        );

        if (!order.checkoutUrl) {
          throw new Error("Checkout URL was not returned by the backend.");
        }

        window.location.assign(order.checkoutUrl);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <div className="space-y-6">
        <Panel>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent">
              Checkout start
            </p>
            <h1 className="font-display text-3xl">Review your ticket selection.</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Confirm the event, ticket type, quantity, and pricing before secure payment
              begins.
            </p>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.85fr)]">
          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Event
                </p>
                <h2 className="font-display text-2xl text-foreground">{event.title}</h2>
                <p className="text-sm leading-6 text-muted">
                  {formatEventTime(event.startsAt, event.timezone)}
                </p>
                <p className="text-sm leading-6 text-muted">{event.venueLabel}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Ticket type
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {selection.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">{selection.priceLabel} each</p>
                </div>
                <div className="rounded-[1.35rem] border border-border bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Quantity
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {selection.quantity} ticket{selection.quantity > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {selection.maxPerOrder
                      ? `Limit ${selection.maxPerOrder} per order`
                      : `${selection.quantityAvailable} currently available`}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-black/10 p-4 text-sm leading-6 text-muted">
                Your attendee-authenticated selection is locked in for this checkout start.
                If checkout fails, you can retry without rebuilding this selection from
                scratch.
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Pricing summary
                </p>
                <div className="space-y-3 rounded-[1.35rem] border border-border bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-muted">
                    <span>
                      {selection.name} x {selection.quantity}
                    </span>
                    <span>
                      {quoteQuery.data?.subtotalAmount
                        ? formatMoney(quoteQuery.data.subtotalAmount, quoteQuery.data.currency)
                        : subtotalLabel}
                    </span>
                  </div>
                  {quoteQuery.isLoading ? (
                    <p className="border-t border-border pt-3 text-sm leading-6 text-muted">
                      Calculating the exact backend quote now.
                    </p>
                  ) : null}
                  {quoteQuery.data ? (
                    <>
                      <div className="flex items-center justify-between gap-4 text-sm text-muted">
                        <span>{quoteQuery.data.feePolicy.displayName}</span>
                        <span>{formatMoney(quoteQuery.data.feeAmount, quoteQuery.data.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
                          Total
                        </span>
                        <span className="font-display text-3xl text-foreground">
                          {formatMoney(quoteQuery.data.totalAmount, quoteQuery.data.currency)}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted">
                        {quoteQuery.data.feePolicy.responsibility === "BUYER"
                          ? `${quoteQuery.data.feePolicy.displayName} is included in your checkout total.`
                          : `${quoteQuery.data.feePolicy.displayName} is absorbed by the organizer for this order.`}
                      </p>
                      <p className="text-xs leading-5 text-muted">
                        {describeFeePolicy(quoteQuery.data.feePolicy)}
                      </p>
                    </>
                  ) : null}
                  {quoteQuery.isError ? (
                    <p className="border-t border-border pt-3 text-sm leading-6 text-danger">
                      Exact pricing could not be confirmed right now. You can retry or continue to let checkout attempt the latest calculation.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={beginPayment}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending ? "Starting secure payment..." : "Continue to secure payment"}
                </button>
                <Link
                  href={`/events/${event.slug}`}
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                >
                  Back to event details
                </Link>
              </div>

              {errorMessage ? (
                <p className="rounded-[1.25rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </ProtectedSurfaceGate>
  );
}
