"use client";

import { apiFetch } from "@/lib/api/client";

export type CreateTransferPayload = {
  expiresAt?: string;
  message?: string;
  recipientEmail: string;
  recipientUserId?: string;
};

export type TransferResponse = {
  acceptedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
  id: string;
  message: string | null;
  ownershipRevision: number;
  reminderSentAt: string | null;
  recipientEmail: string | null;
  recipientUserId: string | null;
  senderUserId: string;
  serialNumber: string;
  status: string;
  ticketId: string;
  ticketStatus: string;
  transferToken: string;
};

export type IncomingTransfer = {
  event: {
    id: string;
    slug: string;
    startsAt: string;
    title: string;
  };
  expiresAt: string;
  id: string;
  isExpired: boolean;
  message: string | null;
  reminderSentAt: string | null;
  senderEmail: string;
  senderUserId: string;
  serialNumber: string;
  status: string;
  ticketType: {
    id: string;
    name: string;
  };
};

export function getTransferAcceptPath(serialNumber: string) {
  return `/transfer/accept/${encodeURIComponent(serialNumber)}`;
}

export async function createTransfer(
  serialNumber: string,
  payload: CreateTransferPayload,
  accessToken: string,
) {
  return apiFetch<TransferResponse>(`/api/me/tickets/${serialNumber}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function acceptTransfer(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<TransferResponse>(`/api/tickets/${serialNumber}/accept-transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

export async function listIncomingTransfers(accessToken: string) {
  return apiFetch<IncomingTransfer[]>("/api/me/transfer-inbox", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function cancelTransfer(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<TransferResponse>(`/api/me/tickets/${serialNumber}/cancel-transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

export async function remindTransfer(
  serialNumber: string,
  accessToken: string,
) {
  return apiFetch<TransferResponse>(`/api/me/tickets/${serialNumber}/remind-transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}
