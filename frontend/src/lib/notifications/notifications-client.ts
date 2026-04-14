"use client";

import { apiFetch } from "@/lib/api/client";

export type WalletNotification = {
  actionUrl: string | null;
  body: string;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  status: string;
  title: string;
  type: string;
};

export async function listWalletNotifications(accessToken: string) {
  return apiFetch<WalletNotification[]>("/api/me/notifications", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function markWalletNotificationAsRead(
  notificationId: string,
  accessToken: string,
) {
  return apiFetch<WalletNotification>(`/api/me/notifications/${notificationId}/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}
