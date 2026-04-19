"use client";

import { PropsWithChildren, useEffect } from "react";

import { reportWebRuntimeIssue } from "@/lib/monitoring/runtime-monitoring";

export function RuntimeMonitoringProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      void reportWebRuntimeIssue({
        component: "window",
        message: event.message || "Unknown browser runtime error",
        route: window.location.pathname,
        stack: event.error instanceof Error ? event.error.stack : undefined,
        type: "web-global-error",
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";

      void reportWebRuntimeIssue({
        component: "window",
        message,
        metadata: {
          reasonType: typeof reason,
        },
        route: window.location.pathname,
        stack: reason instanceof Error ? reason.stack : undefined,
        type: "web-unhandled-rejection",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return children;
}
