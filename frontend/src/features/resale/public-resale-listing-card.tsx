"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api/client";
import {
  buyResaleListing,
  type PublicResaleListing,
} from "@/lib/resale/resale-client";

function formatCurrency(price: string, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "This resale purchase could not be started right now.";
}

export function PublicResaleListingCard({
  listing,
}: {
  listing: PublicResaleListing;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function beginPurchase() {
    if (!session) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const purchased = await buyResaleListing(listing.serialNumber, session.accessToken);
        router.push(`/wallet/${encodeURIComponent(purchased.serialNumber)}`);
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <article className="rounded-[1.4rem] border border-border bg-black/10 p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Resale listing
            </p>
            <h3 className="mt-2 font-display text-2xl text-foreground">
              {listing.ticketType.name}
            </h3>
          </div>
          <p className="font-display text-3xl text-foreground">
            {formatCurrency(listing.askingPrice, listing.currency)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] border border-border bg-black/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Listed
            </p>
            <p className="mt-2 text-sm text-foreground">{formatDateTime(listing.listedAt)}</p>
          </div>
          <div className="rounded-[1rem] border border-border bg-black/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Expires
            </p>
            <p className="mt-2 text-sm text-foreground">{formatDateTime(listing.expiresAt)}</p>
          </div>
        </div>

        <p className="rounded-[1rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
          This is a controlled resale listing for {listing.event.title}. Purchase moves the ticket into your wallet and rotates live ownership.
        </p>

        <div className="flex flex-wrap gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={beginPurchase}
              disabled={isPending}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isPending ? "Buying resale..." : "Buy resale ticket"}
            </button>
          ) : (
            <Link
              href={`/auth?mode=login&next=${encodeURIComponent(pathname || `/marketplace/${listing.event.slug}`)}`}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Sign in to buy
            </Link>
          )}

          <Link
            href={`/events/${listing.event.slug}`}
            className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
          >
            View event
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-[1rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </article>
  );
}
