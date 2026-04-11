"use client";

type SampleTicket = {
  ownershipRevision: number;
  qrTokenId: string;
  serialNumber: string;
  status: string;
};

type Props = {
  cameraActive: boolean;
  cameraError: string | null;
  cameraSupported: boolean;
  degradedMode: boolean;
  isCameraPending: boolean;
  isPending: boolean;
  scanError: string | null;
  scanInput: string;
  scanRevision: string;
  scanSessionId: string | null;
  selectedEvent: { id: string } | null;
  syncNotice: string | null;
  sampleTickets: SampleTicket[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onSubmitValidation: () => void;
  onClearInput: () => void;
  onLoadSampleTicket: (qrTokenId: string, revision: number) => void;
  onScanInputChange: (value: string) => void;
  onScanRevisionChange: (value: string) => void;
};

export function ScannerValidationPanel({
  cameraActive,
  cameraError,
  cameraSupported,
  degradedMode,
  isCameraPending,
  isPending,
  scanError,
  scanInput,
  scanRevision,
  scanSessionId,
  selectedEvent,
  syncNotice,
  sampleTickets,
  videoRef,
  onStartCamera,
  onStopCamera,
  onSubmitValidation,
  onClearInput,
  onLoadSampleTicket,
  onScanInputChange,
  onScanRevisionChange,
}: Props) {
  return (
    <>
      <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">
              Camera scanning
            </p>
            <h3 className="font-display text-2xl">
              Scan QR codes with the browser camera
            </h3>
            <p className="text-sm leading-6 text-muted">
              Use the device camera for faster entry scanning. Manual token input and
              degraded-mode queueing still remain available below.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-[1.35rem] border border-border bg-black/20">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-6 text-muted">
                  {cameraSupported
                    ? "Start the camera and point it at a ticket QR code."
                    : "Camera QR scanning is not supported in this browser. Manual input remains available."}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
                {cameraActive
                  ? "Camera is active. A detected QR code will flow straight into the current validation path."
                  : "Camera scanning is optional and layered on top of the same validated scanner workflow."}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={cameraActive ? onStopCamera : onStartCamera}
                  disabled={isCameraPending || !selectedEvent}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isCameraPending
                    ? "Starting camera..."
                    : cameraActive
                      ? "Stop camera"
                      : "Start camera scanner"}
                </button>
                <button
                  type="button"
                  onClick={onStopCamera}
                  disabled={!cameraActive}
                  className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/30 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Reset camera
                </button>
              </div>

              {cameraError ? (
                <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                  {cameraError}
                </div>
              ) : null}

              <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-4 text-sm leading-6 text-muted">
                If the camera is unavailable, denied, or unreliable, continue with the
                manual scanner input below without losing degraded-mode recovery.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">
              Live validation
            </p>
            <h3 className="font-display text-2xl">Validate the presented ticket now</h3>
            <p className="text-sm leading-6 text-muted">
              Submit a QR token id or full signed QR payload. When connectivity is
              degraded, the scanner falls back to manifest-based guidance and queues
              attempts for later sync.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                QR token id or signed payload
              </span>
              <textarea
                value={scanInput}
                onChange={(event) => onScanInputChange(event.target.value)}
                rows={4}
                placeholder="qr_seed_ga_0001 or eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-success/40"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Ownership revision
                </span>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={scanRevision}
                  onChange={(event) => onScanRevisionChange(event.target.value)}
                  placeholder="1"
                  className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground outline-hidden transition focus:border-success/40"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Scan session
                </span>
                <div className="rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-sm text-foreground/90">
                  {scanSessionId ?? "A live scan session will be created on first validation or sync."}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSubmitValidation}
                disabled={isPending}
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isPending
                  ? degradedMode
                    ? "Queueing..."
                    : "Validating..."
                  : degradedMode
                    ? "Queue degraded attempt"
                    : "Validate ticket"}
              </button>
              <button
                type="button"
                onClick={onClearInput}
                className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-success/30 hover:bg-black/10"
              >
                Clear input
              </button>
            </div>

            {scanError ? (
              <div className="rounded-[1.2rem] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                {scanError}
              </div>
            ) : null}

            {syncNotice ? (
              <div className="rounded-[1.2rem] border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success">
                {syncNotice}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-border bg-black/10 px-5 py-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Quick picks
            </p>
            <h3 className="font-display text-2xl">Manifest-backed sample tickets</h3>
            <p className="text-sm leading-6 text-muted">
              Helpful for smoke testing the validation flow before camera scanning is added.
            </p>
          </div>

          <div className="space-y-3">
            {sampleTickets.map((ticket) => (
              <button
                key={`${ticket.serialNumber}-${ticket.ownershipRevision}`}
                type="button"
                onClick={() => onLoadSampleTicket(ticket.qrTokenId, ticket.ownershipRevision)}
                className="w-full rounded-[1.2rem] border border-border bg-black/15 px-4 py-3 text-left transition hover:border-success/30 hover:bg-black/20"
              >
                <p className="text-sm font-semibold text-foreground">{ticket.serialNumber}</p>
                <p className="mt-1 text-sm text-muted">
                  {ticket.status} · rev {ticket.ownershipRevision}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
