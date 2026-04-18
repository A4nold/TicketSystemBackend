import { describe, expect, it } from "vitest";

import {
  buildDegradedAttempt,
  getOutcomeExplanation,
  getOutcomeHeading,
} from "@/features/scanner/scanner-model";
import type { ScannerManifestResponse } from "@/lib/scanner/scanner-client";

const manifest: ScannerManifestResponse = {
  eventId: "event-1",
  eventSlug: "campus-neon",
  eventTitle: "Campus Neon",
  generatedAt: "2026-05-01T18:00:00.000Z",
  manifestVersion: 4,
  tickets: [
    {
      ownerEmail: "guest@example.com",
      ownershipRevision: 1,
      qrTokenId: "qr-1",
      serialNumber: "ABC123",
      status: "ISSUED",
    },
  ],
};

describe("scanner-model", () => {
  it("builds a degraded valid attempt from a prepared manifest", () => {
    const attempt = buildDegradedAttempt("qr-1", "", manifest, "session-1");

    expect(attempt.outcome).toBe("VALID");
    expect(attempt.reasonCode).toBe("degraded_manifest_ready");
    expect(getOutcomeHeading(attempt)).toContain("Limited-confidence");
  });

  it("marks unknown manifest scans invalid", () => {
    const attempt = buildDegradedAttempt("unknown", "", manifest, null);

    expect(attempt.outcome).toBe("INVALID");
    expect(getOutcomeExplanation(attempt)).toContain("could not be matched");
  });
});
