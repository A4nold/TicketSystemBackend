"use client";

import { env } from "@/lib/config/env";

type RuntimeReportInput = {
  component?: string;
  message: string;
  metadata?: Record<string, unknown>;
  route?: string;
  stack?: string;
  type: string;
};

export async function reportWebRuntimeIssue(input: RuntimeReportInput) {
  try {
    await fetch(`${env.apiBaseUrl}/api/monitoring/runtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        surface: "frontend",
      }),
    });
  } catch {
    // Avoid cascading failures while reporting client runtime issues.
  }
}
