import { apiFetch } from "@/lib/api/client";

export type PaymentProviderCode = "STRIPE" | "PAYSTACK" | "MANUAL";
export type PaymentProviderAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "COMING_SOON";

export type PaymentProviderAvailabilityItem = {
  detail: string | null;
  operatingModel: string;
  provider: PaymentProviderCode;
  recommended: boolean;
  rolloutStage: "ACTIVE" | "LIMITED" | "PLANNED";
  status: PaymentProviderAvailabilityStatus;
  summary: string;
  supportsCustomerCheckout: boolean;
  supportsDisputes: boolean;
  supportsOnboarding: boolean;
  supportsPayouts: boolean;
  supportsPlatformFeeAutomation: boolean;
  supportsRefunds: boolean;
};

export type PaymentProviderAvailabilityResponse = {
  country: string | null;
  defaultPayoutCurrency: string | null;
  providers: PaymentProviderAvailabilityItem[];
  recommendedProvider: PaymentProviderCode | null;
  selectedProvider: PaymentProviderCode | null;
};

export type PaymentProviderCapabilityMatrixResponse = {
  providers: PaymentProviderAvailabilityItem[];
};

export async function getPaymentProviderAvailability(accessToken: string) {
  return apiFetch<PaymentProviderAvailabilityResponse>("/api/payments/providers/availability", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function selectPaymentProvider(
  accessToken: string,
  provider: PaymentProviderCode,
) {
  return apiFetch("/api/payments/provider-selection", {
    body: JSON.stringify({ provider }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function getPaymentProviderCapabilityMatrix(accessToken: string) {
  return apiFetch<PaymentProviderCapabilityMatrixResponse>(
    "/api/payments/providers/capability-matrix",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}
