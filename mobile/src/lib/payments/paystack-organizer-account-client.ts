import { apiFetch } from "@/lib/api/client";

export type PaystackOrganizerAccountStatus = {
  organizerId: string;
  subaccountCode: string | null;
  status: string | null;
  onboardingStatus: string | null;
  verificationStatus: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  country: string | null;
  defaultCurrency: string | null;
  disabledReason: string | null;
  isReadyForPaidEvents: boolean;
  onboardingCompletedAt: string | null;
  lastSyncedAt: string | null;
  readinessCheckedAt: string | null;
  firstReadyAt: string | null;
  requirementsSummary: string | null;
  businessName: string | null;
  accountHolderName: string | null;
  bankCode: string | null;
  maskedAccountNumber: string | null;
  settlementSchedule: string | null;
  isVerified: boolean;
  isActive: boolean;
};

export type UpsertPaystackOrganizerAccountInput = {
  businessName: string;
  accountHolderName?: string;
  bankCode: string;
  accountNumber: string;
};

export type PaystackBankSummary = {
  name: string;
  code: string;
  slug: string | null;
};

export type ResolvedPaystackBankAccount = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankId: number | null;
};

export async function getPaystackOrganizerAccountStatus(accessToken: string) {
  return apiFetch<PaystackOrganizerAccountStatus>("/api/payments/paystack/account", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createPaystackOrganizerAccount(
  accessToken: string,
  input: UpsertPaystackOrganizerAccountInput,
) {
  return apiFetch<PaystackOrganizerAccountStatus>("/api/payments/paystack/account", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function updatePaystackOrganizerAccount(
  accessToken: string,
  input: UpsertPaystackOrganizerAccountInput,
) {
  return apiFetch<PaystackOrganizerAccountStatus>("/api/payments/paystack/account", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

export async function listPaystackBanks(accessToken: string) {
  return apiFetch<PaystackBankSummary[]>("/api/payments/paystack/banks", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function resolvePaystackBankAccount(
  accessToken: string,
  input: {
    bankCode: string;
    accountNumber: string;
  },
) {
  return apiFetch<ResolvedPaystackBankAccount>("/api/payments/paystack/resolve-account", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
