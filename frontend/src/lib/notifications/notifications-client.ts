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

type PaginatedWalletNotificationsResponse = {
  items: WalletNotification[];
  nextCursor: string | null;
};

export async function listWalletNotifications(accessToken: string) {
  const response = await apiFetch<WalletNotification[] | PaginatedWalletNotificationsResponse>(
    "/api/me/notifications",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (Array.isArray(response)) {
    return response;
  }

  return response.items ?? [];
}

export async function listWalletNotificationsPage(accessToken: string) {
  const response = await apiFetch<WalletNotification[] | PaginatedWalletNotificationsResponse>(
    "/api/me/notifications",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (Array.isArray(response)) {
    return {
      items: response,
      nextCursor: null,
    };
  }

  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null,
  };
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
