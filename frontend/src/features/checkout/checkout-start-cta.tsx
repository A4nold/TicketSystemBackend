"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";

type CheckoutStartCtaProps = Readonly<{
  eventSlug: string;
  ticketType: {
    availabilityLabel: string;
    id: string;
    isPurchasable: boolean;
    maxPerOrder: number | null;
    name: string;
    priceLabel: string;
    priceValue: number;
    quantity: number;
    restrictionCopy: string;
  };
}>;

function getCheckoutStartPath(
  eventSlug: string,
  ticketTypeId: string,
  quantity: number,
) {
  const search = new URLSearchParams({
    eventSlug,
    quantity: String(quantity),
    ticketTypeId,
  });

  return `/tickets/checkout/start?${search.toString()}`;
}

export function CheckoutStartCta({
  eventSlug,
  ticketType,
}: CheckoutStartCtaProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxSelectable = useMemo(() => {
    const bounds = [ticketType.quantity];

    if (ticketType.maxPerOrder) {
      bounds.push(ticketType.maxPerOrder);
    }

    return Math.max(1, Math.min(...bounds));
  }, [ticketType.maxPerOrder, ticketType.quantity]);

  const totalLabel = useMemo(() => {
    return new Intl.NumberFormat("en-IE", {
      currency: "EUR",
      maximumFractionDigits: 2,
      style: "currency",
    }).format(ticketType.priceValue * quantity);
  }, [quantity, ticketType.priceValue]);

  function updateQuantity(nextValue: number) {
    if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > maxSelectable) {
      setErrorMessage(
        `Choose a quantity between 1 and ${maxSelectable} for ${ticketType.name}.`,
      );
      return;
    }

    setErrorMessage(null);
    setQuantity(nextValue);
  }

  function continueToCheckout() {
    if (!ticketType.isPurchasable) {
      setErrorMessage(ticketType.restrictionCopy);
      return;
    }

    if (quantity < 1 || quantity > maxSelectable) {
      setErrorMessage(
        `Choose a quantity between 1 and ${maxSelectable} for ${ticketType.name}.`,
      );
      return;
    }

    const nextPath = getCheckoutStartPath(eventSlug, ticketType.id, quantity);

    if (!isAuthenticated) {
      router.push(
        `/auth?mode=login&eventSlug=${encodeURIComponent(eventSlug)}&next=${encodeURIComponent(nextPath)}`,
      );
      return;
    }

    router.push(nextPath);
  }

  if (!ticketType.isPurchasable) {
    return (
      <div className="space-y-2">
        <p className="text-sm leading-6 text-muted">{ticketType.restrictionCopy}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Quantity
          </span>
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-border bg-background/80 px-3 py-2">
            <button
              type="button"
              onClick={() => updateQuantity(quantity - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/10 text-lg text-foreground transition hover:border-accent/50 hover:bg-black/20"
              aria-label={`Decrease ${ticketType.name} quantity`}
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxSelectable}
              value={quantity}
              onChange={(event) => updateQuantity(Number(event.target.value))}
              className="w-full bg-transparent text-center text-base font-semibold text-foreground outline-hidden"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => updateQuantity(quantity + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/10 text-lg text-foreground transition hover:border-accent/50 hover:bg-black/20"
              aria-label={`Increase ${ticketType.name} quantity`}
            >
              +
            </button>
          </div>
        </label>

        <div className="rounded-[1.2rem] border border-border bg-background/80 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Ticket total
          </p>
          <p className="mt-1 font-display text-2xl text-foreground">{totalLabel}</p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={continueToCheckout}
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
        >
          Continue with {ticketType.name}
        </button>
        <p className="text-sm leading-6 text-muted">
          {isAuthenticated
            ? "You will review this selection once more before secure payment begins."
            : "Sign in or create an account first, then continue into checkout with this exact selection."}
        </p>
        {errorMessage ? (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
