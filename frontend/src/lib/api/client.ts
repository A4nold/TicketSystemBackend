import { env } from "@/lib/config/env";

type QueryPrimitive = string | number | boolean | null;
type QueryValue = QueryPrimitive | QueryPrimitive[] | undefined;
type ApiFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};
type ApiErrorBody = {
  error?: string;
  message?: string | string[];
  path?: string;
  requestId?: string;
  statusCode?: number;
  timestamp?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string | string[],
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
) {
  const url = new URL(path, env.apiBaseUrl);

  if (!query) {
    return url;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      url.searchParams.append(key, String(item));
    }
  }

  return url;
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit,
  query?: Record<string, QueryValue>,
) {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const hasJsonBody = contentType.includes("application/json");
  const responseBody = hasJsonBody
    ? ((await response.json()) as ApiErrorBody | T)
    : undefined;

  if (!response.ok) {
    const errorBody = responseBody as ApiErrorBody | undefined;
    const details = errorBody?.message;
    const message =
      typeof details === "string"
        ? details
        : Array.isArray(details)
          ? details.join(" ")
          : `API request failed for ${path}`;

    throw new ApiError(message, response.status, details, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!hasJsonBody) {
    return undefined as T;
  }

  return responseBody as T;
}
