import { apiFetch } from "@/lib/api/client";

export type OrganizerOnboardingStatus =
  | "NOT_STARTED"
  | "PROFILE_INCOMPLETE"
  | "PROFILE_COMPLETED"
  | "PAYMENT_SETUP_PENDING"
  | "READY_FOR_PAID_EVENTS";

export type OrganizerProfile = {
  businessName: string | null;
  country: string | null;
  createdAt: string;
  defaultPayoutCurrency: string | null;
  displayName: string | null;
  id: string;
  onboardingStatus: OrganizerOnboardingStatus;
  providerSelectedAt: string | null;
  providerSelectionSource: "AUTO_RECOMMENDED" | "MANUAL" | null;
  recommendedProvider: "STRIPE" | "PAYSTACK" | "MANUAL" | null;
  selectedPaymentProvider: "STRIPE" | "PAYSTACK" | "MANUAL" | null;
  updatedAt: string;
  userId: string;
};

export type UpsertOrganizerProfilePayload = {
  businessName?: string;
  country?: string;
  defaultPayoutCurrency?: string;
  displayName?: string;
};

export async function getOrganizerProfile(accessToken: string) {
  return apiFetch<OrganizerProfile>("/api/organizer/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function upsertOrganizerProfile(
  accessToken: string,
  payload: UpsertOrganizerProfilePayload,
) {
  return apiFetch<OrganizerProfile>("/api/organizer/profile", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}
