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

export async function registerAttendee(payload: RegisterPayload) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

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
