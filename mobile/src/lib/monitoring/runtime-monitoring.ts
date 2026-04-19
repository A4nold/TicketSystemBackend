import { getApiBaseUrl } from "@/lib/config/env";

type RuntimeReportInput = {
  component?: string;
  message: string;
  metadata?: Record<string, unknown>;
  route?: string;
  stack?: string;
  type: string;
};

export async function reportMobileRuntimeIssue(input: RuntimeReportInput) {
  try {
    await fetch(`${getApiBaseUrl()}/api/monitoring/runtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        surface: "mobile",
      }),
    });
  } catch {
    // Avoid recursive runtime failures while reporting mobile errors.
  }
}
