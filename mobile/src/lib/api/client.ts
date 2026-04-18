import { getApiBaseUrl } from "@/lib/config/env";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(path, getApiBaseUrl());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>,
) {
  const response = await fetch(buildUrl(path, query), init);

  if (!response.ok) {
    let message = "Request failed.";

    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message[0] ?? message;
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
