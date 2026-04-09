"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";

import { useAuth } from "@/components/providers/auth-provider";
import { Panel } from "@/components/ui/panel";
import { getOwnedTicketQrPayload } from "@/lib/tickets/tickets-client";

type TicketQrPanelProps = Readonly<{
  isQrAvailable: boolean;
  serialNumber: string;
  stateLabel: string;
  stateSummary: string;
}>;

export function TicketQrPanel({
  isQrAvailable,
  serialNumber,
  stateLabel,
  stateSummary,
}: TicketQrPanelProps) {
  const { session } = useAuth();
  const [shouldLoadQr, setShouldLoadQr] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const qrQuery = useQuery({
    enabled: Boolean(session?.accessToken && shouldLoadQr && isQrAvailable),
    queryFn: () => getOwnedTicketQrPayload(serialNumber, session!.accessToken),
    queryKey: ["owned-ticket-qr", serialNumber, session?.accessToken],
    retry: 1,
  });

  useEffect(() => {
    let isMounted = true;

    async function buildQrImage() {
      if (!qrQuery.data?.signedToken) {
        if (isMounted) {
          setQrImageUrl(null);
        }
        return;
      }

      const dataUrl = await QRCode.toDataURL(qrQuery.data.signedToken, {
        color: {
          dark: "#050816",
          light: "#f7f6f0",
        },
        margin: 2,
        width: 520,
      });

      if (isMounted) {
        setQrImageUrl(dataUrl);
      }
    }

    void buildQrImage();

    return () => {
      isMounted = false;
    };
  }, [qrQuery.data?.signedToken]);

  if (!isQrAvailable) {
    return (
      <Panel className="border-warning/30 bg-warning/8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-warning">
            QR unavailable for this ticket state
          </p>
          <h2 className="font-display text-3xl text-foreground">
            This ticket is not currently ready for entry presentation.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-foreground/85">
            {stateSummary} Until the state changes, we will not show an entry-ready QR for{" "}
            <span className="font-medium">{stateLabel}</span>.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="border-success/30 bg-success/10">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-success">
            Scan-ready QR
          </p>
          <h2 className="font-display text-3xl text-foreground">
            Present this code at the door.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-foreground/85">
            This QR is tied to the ticket&apos;s current live ownership state, so refresh if
            you need to confirm the latest backend truth before entry.
          </p>
        </div>

        {!shouldLoadQr ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShouldLoadQr(true)}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Show scan-ready QR
            </button>
          </div>
        ) : null}

        {shouldLoadQr && (qrQuery.isLoading || qrQuery.isFetching) ? (
          <div className="rounded-[1.5rem] border border-success/20 bg-black/10 p-5 text-sm leading-6 text-foreground/85">
            Preparing your scan-ready QR from the backend.
          </div>
        ) : null}

        {shouldLoadQr && qrQuery.isError ? (
          <div className="space-y-3 rounded-[1.5rem] border border-warning/20 bg-black/10 p-5">
            <p className="text-sm leading-6 text-foreground/85">
              We could not retrieve the current QR for this ticket. Retry before assuming
              the current code is available.
            </p>
            <button
              type="button"
              onClick={() => qrQuery.refetch()}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
            >
              Retry QR retrieval
            </button>
          </div>
        ) : null}

        {shouldLoadQr && qrQuery.data && qrImageUrl ? (
          <div className="space-y-4">
            <div className="mx-auto w-full max-w-[22rem] rounded-[2rem] border border-success/20 bg-[#f7f6f0] p-5 shadow-[0_18px_60px_rgba(2,8,20,0.18)]">
              <Image
                src={qrImageUrl}
                alt={`Scan-ready QR for ticket ${serialNumber}`}
                width={520}
                height={520}
                className="h-auto w-full rounded-[1.2rem]"
                unoptimized
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Token expires
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {qrQuery.data.expiresAt
                    ? new Intl.DateTimeFormat("en-IE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(qrQuery.data.expiresAt))
                    : "No expiry returned"}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-success/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Ownership revision
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {qrQuery.data.ownershipRevision}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => qrQuery.refetch()}
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft"
              >
                Refresh QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShouldLoadQr(false);
                  setQrImageUrl(null);
                }}
                className="inline-flex rounded-full border border-border bg-white/8 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent/50 hover:bg-white/12"
              >
                Return to ticket detail
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
