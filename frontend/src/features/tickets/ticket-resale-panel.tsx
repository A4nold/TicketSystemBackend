"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { createResaleListing } from "@/lib/resale/resale-client";

type TicketResalePanelProps = Readonly<{
  eventResalePolicy?: {
    endsAt: string | null;
    maxResalePrice: string | null;
    minResalePrice: string | null;
    resaleRoyaltyPercent: string | null;
    startsAt: string | null;
  } | null;
  latestResaleListing:
    | {
        askingPrice: string;
        currency: string;
        listedAt: string | null;
        organizerRoyaltyAmount: string | null;
        sellerNetAmount: string | null;
        soldAt: string | null;
        status: string;
      }
    | null;
  latestTransfer:
    | {
        status: string;
      }
    | null;
  onResaleCreated: () => Promise<unknown> | unknown;
  eventSlug?: string;
  serialNumber: string;
  status: string;
}>;

const resaleSchema = z.object({
  askingPrice: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
      message: "Enter a valid resale price such as 18 or 18.50.",
    }),
  expiresAt: z.string().optional(),
});

function formatDateTime(date: string | null) {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getResaleEligibility(
  status: string,
  latestTransfer: TicketResalePanelProps["latestTransfer"],
  latestResaleListing: TicketResalePanelProps["latestResaleListing"],
) {
  if (latestResaleListing?.status === "LISTED" || status === "RESALE_LISTED") {
    return {
      canList: false,
      summary:
        "This ticket is already listed for resale, so a second resale listing cannot be created right now.",
      tone: "warning" as const,
    };
  }

  if (latestTransfer?.status === "PENDING" || status === "TRANSFER_PENDING") {
    return {
      canList: false,
      summary:
        "This ticket has a pending transfer, so resale is blocked until that transfer state changes.",
      tone: "warning" as const,
    };
  }

  if (status === "ISSUED" || status === "PAID") {
    return {
      canList: true,
      summary:
        "List this ticket only if you are ready to move it through the organizer-controlled resale path. The ticket will stop behaving like a normal active ticket after listing.",
      tone: "success" as const,
    };
  }

  if (status === "USED") {
    return {
      canList: false,
      summary: "This ticket has already been used and cannot be listed for resale.",
      tone: "danger" as const,
    };
  }

  return {
    canList: false,
    summary:
      "This ticket is not currently in an eligible state for resale. If event rules allow resale later, backend truth will reflect that when the state changes.",
    tone: "danger" as const,
  };
}

function getErrorText(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Resale listing could not be created right now. Please try again.";
}

export function TicketResalePanel({
  eventResalePolicy,
  eventSlug,
  latestResaleListing,
  latestTransfer,
  onResaleCreated,
  serialNumber,
  status,
}: TicketResalePanelProps) {
  const { session } = useAuth();
  const [askingPrice, setAskingPrice] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [settlementPreview, setSettlementPreview] = useState<{
    currency: string;
    organizerRoyaltyAmount: string | null;
    sellerNetAmount: string | null;
  } | null>(null);
  const eligibility = getResaleEligibility(
    status,
    latestTransfer,
    latestResaleListing,
  );

  const toneClass =
    eligibility.tone === "success"
      ? "border-accent/30 bg-accent/8"
      : eligibility.tone === "warning"
        ? "border-warning/30 bg-warning/8"
        : "border-danger/30 bg-danger/10";

  function submitResale() {
    if (!session) {
      setErrorMessage("Your attendee session is not available. Sign in again to continue.");
      return;
    }

    const parsed = resaleSchema.safeParse({
      askingPrice,
      expiresAt: expiresAt || undefined,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Check the resale details.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setSettlementPreview(null);

    startTransition(async () => {
      try {
        const listing = await createResaleListing(
          serialNumber,
          parsed.data,
          session.accessToken,
        );
        await onResaleCreated();
        setSettlementPreview({
          currency: listing.currency,
          organizerRoyaltyAmount: listing.organizerRoyaltyAmount,
          sellerNetAmount: listing.sellerNetAmount,
        });
        setSuccessMessage(
          `Resale listing created at ${listing.askingPrice} ${listing.currency}. Seller net is ${listing.sellerNetAmount ?? listing.askingPrice} ${listing.currency}${listing.organizerRoyaltyAmount ? ` after ${listing.organizerRoyaltyAmount} ${listing.currency} organizer royalty.` : "."}`,
        );
      } catch (error) {
        setErrorMessage(getErrorText(error));
      }
    });
  }

  return (
    <Panel className={toneClass}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
            Resale listing
          </p>
          <h2 className="font-display text-3xl text-foreground">
            {eligibility.canList
              ? "List this ticket for controlled resale"
              : "Resale is limited right now"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-foreground/85">
            {eligibility.summary}
          </p>
          {eventResalePolicy ? (
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Organizer policy:
              {eventResalePolicy.minResalePrice
                ? ` floor ${eventResalePolicy.minResalePrice} EUR.`
                : " no floor set."}{" "}
              {eventResalePolicy.maxResalePrice
                ? `cap ${eventResalePolicy.maxResalePrice} EUR.`
                : "No cap set."}{" "}
              {eventResalePolicy.resaleRoyaltyPercent
                ? `Royalty ${eventResalePolicy.resaleRoyaltyPercent}% is deducted from the sale price before seller payout.`
                : "No organizer royalty is currently configured."}
            </p>
          ) : null}
        </div>

        {latestResaleListing ? (
          <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-foreground">
              Current resale state: {latestResaleListing.status.replaceAll("_", " ")}
            </p>
            <p className="mt-1">
              Asking price {latestResaleListing.askingPrice} {latestResaleListing.currency}.
            </p>
            {latestResaleListing.sellerNetAmount ? (
              <p>
                Seller net {latestResaleListing.sellerNetAmount} {latestResaleListing.currency}
                {latestResaleListing.organizerRoyaltyAmount
                  ? ` after ${latestResaleListing.organizerRoyaltyAmount} ${latestResaleListing.currency} organizer royalty.`
                  : "."}
              </p>
            ) : null}
            <p>
              Listed: {formatDateTime(latestResaleListing.listedAt)}. Sold:{" "}
              {formatDateTime(latestResaleListing.soldAt)}.
            </p>
            {eventSlug && latestResaleListing.status === "LISTED" ? (
              <div className="mt-3">
                <Link
                  href={`/marketplace/${eventSlug}`}
                  className="inline-flex rounded-full border border-border bg-white/8 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
                >
                  View in marketplace
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {eligibility.canList ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Asking price
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={askingPrice}
                onChange={(event) => setAskingPrice(event.target.value)}
                placeholder="18.00"
                className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent/50"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Optional listing expiry
              </span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-accent/50"
              />
            </label>

            <div className="rounded-[1.2rem] border border-border bg-black/10 px-4 py-3 text-sm leading-6 text-muted">
              Listing this ticket moves it into the resale workflow. Buyers and later
              ownership changes are still controlled by backend rules, so a successful
              listing is not the same as a completed sale.
            </div>

            {eventResalePolicy?.resaleRoyaltyPercent || eventResalePolicy?.minResalePrice || eventResalePolicy?.maxResalePrice ? (
              <div className="rounded-[1.2rem] border border-accent/20 bg-accent/8 px-4 py-3 text-sm leading-6 text-muted">
                Your listing must stay within the organizer&apos;s resale band. Any configured
                organizer royalty is calculated from the final asking price and stored with
                the listing so settlement stays transparent.
              </div>
            ) : null}

            <button
              type="button"
              onClick={submitResale}
              disabled={isPending}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isPending ? "Creating resale listing..." : "List for resale"}
            </button>
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
            {successMessage}
          </div>
        ) : null}

        {settlementPreview?.sellerNetAmount ? (
          <div className="rounded-[1.2rem] border border-success/20 bg-success/8 px-4 py-3 text-sm leading-6 text-foreground/85">
            Expected seller net: {settlementPreview.sellerNetAmount} {settlementPreview.currency}
            {settlementPreview.organizerRoyaltyAmount
              ? `. Organizer royalty: ${settlementPreview.organizerRoyaltyAmount} ${settlementPreview.currency}.`
              : "."}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
