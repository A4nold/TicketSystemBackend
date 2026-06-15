"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTicketOfferRequest } from "@/lib/offers/offers-client";

import { useAuth } from "@/components/providers/auth-provider";
import { formatCurrencyAmount } from "@/lib/formatters";

type CheckoutStartCtaProps = Readonly<{
  eventId: string;
  eventSlug: string;
  initialOfferPrice?: number;
  initialQuantity?: number;
  ticketType: {
    availabilityLabel: string;
    currency: string;
    id: string;
    isPurchasable: boolean;
    maxPerOrder: number | null;
    maxOfferPriceValue: number | null;
    minOfferPriceValue: number | null;
    name: string;
    offerRangeLabel: string | null;
    pricingMode: "FIXED" | "FREE" | "OFFER_RANGE";
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
  eventId,
  eventSlug,
  initialOfferPrice,
  initialQuantity,
  ticketType,
}: CheckoutStartCtaProps) {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState(
    initialOfferPrice ?? ticketType.minOfferPriceValue ?? 0,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxSelectable = useMemo(() => {
    const bounds = [ticketType.quantity];

    if (ticketType.maxPerOrder) {
      bounds.push(ticketType.maxPerOrder);
    }

    return Math.max(1, Math.min(...bounds));
  }, [ticketType.maxPerOrder, ticketType.quantity]);

  const totalLabel = useMemo(() => {
    return formatCurrencyAmount(ticketType.priceValue * quantity, ticketType.currency, {
      maximumFractionDigits: 2,
    });
  }, [quantity, ticketType.priceValue, ticketType.currency]);
  const offeredPriceLabel = useMemo(() => {
    return formatCurrencyAmount(offeredPrice, ticketType.currency, {
      maximumFractionDigits: 2,
    });
  }, [offeredPrice, ticketType.currency]);

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

  async function submitOffer() {
    if (!isAuthenticated) {
      const next = new URLSearchParams({
        ticketTypeId: ticketType.id,
      });
      if (offeredPrice > 0) {
        next.set("offerPrice", offeredPrice.toFixed(2));
      }
      const nextPath = `/events/${eventSlug}?${next.toString()}`;
      router.push(
        `/auth?mode=login&eventSlug=${encodeURIComponent(eventSlug)}&next=${encodeURIComponent(nextPath)}`,
      );
      return;
    }

    if (!ticketType.minOfferPriceValue || !ticketType.maxOfferPriceValue) {
      setErrorMessage("Offer range is not configured for this ticket type.");
      return;
    }

    if (offeredPrice < ticketType.minOfferPriceValue || offeredPrice > ticketType.maxOfferPriceValue) {
      setErrorMessage("Choose an offer inside the allowed range.");
      return;
    }

    setErrorMessage(null);
    setIsSubmittingOffer(true);
    try {
      if (!session?.accessToken) {
        throw new Error("Session expired. Please sign in again.");
      }
      await createTicketOfferRequest(eventId, ticketType.id, offeredPrice.toFixed(2), session.accessToken);
      setErrorMessage("Offer sent. You will get notified when the organizer reviews it.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Offer request failed.");
    } finally {
      setIsSubmittingOffer(false);
    }
  }

  if (!ticketType.isPurchasable) {
    return (
      <div className="space-y-2">
        <p className="text-sm leading-6 text-muted">{ticketType.restrictionCopy}</p>
      </div>
    );
  }

  if (ticketType.pricingMode === "OFFER_RANGE") {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-border bg-background/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Your offer</p>
          <p className="mt-1 font-display text-2xl text-foreground">{offeredPriceLabel}</p>
          <input
            type="range"
            min={ticketType.minOfferPriceValue ?? 0}
            max={ticketType.maxOfferPriceValue ?? 0}
            step="0.5"
            value={offeredPrice}
            onChange={(event) => setOfferedPrice(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <p className="mt-2 text-sm text-muted">
            Range: {ticketType.offerRangeLabel ?? "Not configured"}
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void submitOffer()}
            disabled={isSubmittingOffer}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSubmittingOffer ? "Sending offer..." : `Send offer for ${ticketType.name}`}
          </button>
          <p className="text-sm leading-6 text-muted">
            Organizer must accept this offer before checkout unlocks.
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
          className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
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
