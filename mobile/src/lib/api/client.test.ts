import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "@/lib/api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("serializes defined query parameters", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    } as Response);

    await apiFetch("/api/tickets/me/owned", undefined, {
      eventSlug: "campus-neon",
      status: undefined,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/tickets/me/owned?eventSlug=campus-neon",
      undefined,
    );
  });

  it("throws the first backend message for failed requests", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({ message: ["Invalid credentials."] }),
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    await expect(apiFetch("/api/auth/login")).rejects.toEqual(
      new ApiError("Invalid credentials.", 401),
    );
  });
});
