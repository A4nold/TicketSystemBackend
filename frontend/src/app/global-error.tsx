"use client";

import { useEffect } from "react";

import { reportWebRuntimeIssue } from "@/lib/monitoring/runtime-monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportWebRuntimeIssue({
      component: "global-error-boundary",
      message: error.message,
      metadata: {
        digest: error.digest ?? null,
      },
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      stack: error.stack,
      type: "web-global-boundary",
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f5efe2", color: "#191510" }}>
        <main
          style={{
            maxWidth: 640,
            margin: "0 auto",
            minHeight: "100vh",
            padding: "80px 24px",
            display: "grid",
            alignContent: "center",
            gap: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>
            TicketSystem
          </p>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>
            This page hit an unexpected problem.
          </h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
            The incident has been recorded for follow-up. Try the action again, or return to the previous flow if
            this happened during checkout, wallet access, or scanning.
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: "fit-content",
              minHeight: 48,
              padding: "0 20px",
              borderRadius: 999,
              border: "none",
              background: "#191510",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
