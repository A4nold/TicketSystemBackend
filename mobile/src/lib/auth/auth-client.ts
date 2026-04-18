import { apiFetch } from "@/lib/api/client";
import type { AuthResponse, AuthUser } from "@/lib/auth/types";

export type LoginPayload = {
  email: string;
  password: string;
};

export async function loginAttendee(payload: LoginPayload) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function getCurrentAttendee(accessToken: string) {
  return apiFetch<AuthUser>("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
