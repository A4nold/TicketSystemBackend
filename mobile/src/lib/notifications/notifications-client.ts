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
