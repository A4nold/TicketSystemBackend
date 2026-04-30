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

export type PaginatedWalletNotifications = {
  items: WalletNotification[];
  nextCursor: string | null;
};

export function getInAppPathFromNotification(notification: WalletNotification) {
  const actionUrl = notification.actionUrl?.trim();

  if (!actionUrl) {
    return null;
  }

  if (actionUrl.startsWith("/transfer/accept/")) {
    return actionUrl;
  }

  if (actionUrl.startsWith("/staff/accept/")) {
    return actionUrl;
  }

  if (actionUrl.startsWith("/wallet/")) {
    const serialNumber = actionUrl.slice("/wallet/".length);
    return `/tickets/${serialNumber}`;
  }

  if (actionUrl === "/wallet") {
    return "/wallet";
  }

  return null;
}

export async function listWalletNotifications(
  accessToken: string,
  query?: {
    cursor?: string;
    limit?: number;
  },
) {
  return apiFetch<PaginatedWalletNotifications>(
    "/api/me/notifications",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      cursor: query?.cursor,
      limit: query?.limit?.toString(),
    },
  );
}

export async function markWalletNotificationAsRead(
  notificationId: string,
  accessToken: string,
) {
  return apiFetch<WalletNotification>(
    `/api/me/notifications/${notificationId}/read`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
}
