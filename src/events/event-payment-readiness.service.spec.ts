import { BadRequestException } from "@nestjs/common";
import { PaymentProvider, Prisma } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";

import { EventPaymentReadinessService } from "./event-payment-readiness.service";

describe("EventPaymentReadinessService", () => {
  afterEach(() => {
    delete process.env.ENABLE_STRIPE_CONNECT_EVENT_PUBLISH_GUARD;
  });

  it("allows publish when feature flag is disabled", async () => {
    const service = new EventPaymentReadinessService(
      {
        organizerProfile: {
          findUnique: async () => null,
        },
      } as never,
      {
        getOrganizerStripeReadiness: async () => ({
          isReadyForPaidEvents: false,
        }),
      } as never,
    );

    await expect(
      service.assertOrganizerCanPublishPaidEvent("org_123"),
    ).resolves.toBeUndefined();
  });

  it("rejects publish when organizer stripe account is not ready", async () => {
    process.env.ENABLE_STRIPE_CONNECT_EVENT_PUBLISH_GUARD = "true";

    const service = new EventPaymentReadinessService(
      {
        organizerProfile: {
          findUnique: async () => ({
            selectedPaymentProvider: PaymentProvider.STRIPE,
          }),
        },
      } as never,
      {
        getOrganizerStripeReadiness: async () => ({
          isReadyForPaidEvents: false,
        }),
      } as never,
    );

    await expect(
      service.assertOrganizerCanPublishPaidEvent("org_123"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects publish when organizer paystack account is not ready", async () => {
    process.env.ENABLE_STRIPE_CONNECT_EVENT_PUBLISH_GUARD = "true";

    const service = new EventPaymentReadinessService(
      {
        organizerProfile: {
          findUnique: async () => ({
            selectedPaymentProvider: PaymentProvider.PAYSTACK,
          }),
        },
      } as never,
      {
        getOrganizerPaystackReadiness: async () => ({
          isReadyForPaidEvents: false,
        }),
        getOrganizerStripeReadiness: async () => ({
          isReadyForPaidEvents: true,
        }),
      } as never,
    );

    await expect(
      service.assertOrganizerCanPublishPaidEvent("org_123"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("treats offer-range pricing as paid", () => {
    const service = new EventPaymentReadinessService({} as never, {} as never);

    expect(
      service.requiresPaidEventReadiness({
        pricingMode: "OFFER_RANGE",
        price: new Prisma.Decimal("0"),
      }),
    ).toBe(true);
  });

  it("treats free pricing as not requiring readiness", () => {
    const service = new EventPaymentReadinessService({} as never, {} as never);

    expect(
      service.requiresPaidEventReadiness({
        pricingMode: "FREE",
        price: new Prisma.Decimal("0"),
      }),
    ).toBe(false);
  });
});
