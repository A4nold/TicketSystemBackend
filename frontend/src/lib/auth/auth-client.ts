import { apiFetch } from "@/lib/api/client";
import type { AccountType, AuthResponse, AuthUser } from "@/lib/auth/types";

export type RegisterPayload = {
  accountType?: AccountType;
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  phoneNumber?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export function registerAttendee(payload: RegisterPayload) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function loginAttendee(payload: LoginPayload) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getCurrentAttendee(accessToken: string) {
  return apiFetch<AuthUser>("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
