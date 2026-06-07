import { apiFetch } from "@/lib/api/client";

export type StripeConnectAccountStatus = {
  chargesEnabled: boolean;
  connectedAccountId: string | null;
  country: string | null;
  defaultCurrency: string | null;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  firstReadyAt: string | null;
  isReadyForPaidEvents: boolean;
  lastSyncedAt: string | null;
  onboardingCompletedAt: string | null;
  onboardingStatus: string | null;
  organizerId: string;
  payoutsEnabled: boolean;
  readinessCheckedAt: string | null;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
  status: string | null;
  verificationStatus: string | null;
};

export type StripeConnectLinkResponse = {
  account: StripeConnectAccountStatus;
  expiresAt: string | null;
  onboardingUrl: string;
};

export type OrganizerPaymentTransactionSummary = {
  amount: string;
  connectedAccountId: string | null;
  createdAt: string;
  currency: string;
  eventId: string;
  eventTitle: string;
  grossAmount: string;
  id: string;
  orderId: string | null;
  organizerId: string;
  organizerNetAmount: string;
  platformFeeAmount: string;
  provider: string;
  providerChargeId: string | null;
  providerPaymentIntentId: string | null;
  settlementState: string;
  status: string;
  type: string;
};

export type OrganizerRefundSummary = {
  amount: string;
  createdAt: string;
  currency: string;
  eventId: string;
  eventTitle: string;
  id: string;
  orderId: string | null;
  paymentTransactionId: string;
  processedAt: string | null;
  providerRefundId: string | null;
  reason: string | null;
  refundApplicationFee: boolean;
  requestedAt: string;
  reverseTransfer: boolean;
  status: string;
};

export type OrganizerDisputeSummary = {
  amount: string;
  closedAt: string | null;
  createdAt: string;
  currency: string;
  eventId: string;
  eventTitle: string;
  evidenceDueBy: string | null;
  id: string;
  lostAt: string | null;
  needsResponse: boolean;
  paymentTransactionId: string;
  providerChargeId: string | null;
  providerDisputeId: string;
  reason: string | null;
  status: string;
  wonAt: string | null;
};

export type OrganizerPayoutVisibilitySummary = {
  currency: string;
  disputeCount: number;
  disputeExposureAmount: string;
  grossSales: string;
  lastTransactionAt: string | null;
  netEarnings: string;
  onHoldAmount: string;
  onHoldTransactionCount: number;
  organizerId: string;
  pendingSettlement: string;
  pendingTransactionCount: number;
  platformFees: string;
  refundCount: number;
  refundedAmount: string;
  settledAmount: string;
  successfulTransactionCount: number;
};

export async function getStripeConnectAccountStatus(accessToken: string) {
  return apiFetch<StripeConnectAccountStatus>("/api/payments/stripe/account", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createStripeConnectOnboardingLink(
  accessToken: string,
  payload?: {
    refreshUrl?: string;
    returnUrl?: string;
  },
) {
  return apiFetch<StripeConnectLinkResponse>("/api/payments/stripe/connect", {
    body: JSON.stringify(payload ?? {}),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function refreshStripeConnectOnboardingLink(
  accessToken: string,
  payload?: {
    refreshUrl?: string;
    returnUrl?: string;
  },
) {
  return apiFetch<StripeConnectLinkResponse>("/api/payments/stripe/refresh", {
    body: JSON.stringify(payload ?? {}),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function listOrganizerPaymentTransactions(accessToken: string, limit = 25) {
  return apiFetch<OrganizerPaymentTransactionSummary[]>(
    "/api/payments/stripe/transactions",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    { limit: String(limit) },
  );
}

export async function listOrganizerRefunds(accessToken: string, limit = 25) {
  return apiFetch<OrganizerRefundSummary[]>(
    "/api/payments/stripe/refunds",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    { limit: String(limit) },
  );
}

export async function listOrganizerDisputes(accessToken: string, limit = 25) {
  return apiFetch<OrganizerDisputeSummary[]>(
    "/api/payments/stripe/disputes",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    { limit: String(limit) },
  );
}

export async function getOrganizerPayoutVisibility(accessToken: string) {
  return apiFetch<OrganizerPayoutVisibilitySummary>("/api/payments/stripe/payout-visibility", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
