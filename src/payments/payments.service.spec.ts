import { BadRequestException } from "@nestjs/common";
import { OrderStatus, PaymentProvider, Prisma } from "@prisma/client";
import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentsService } from "./payments.service";

function createCheckoutOrder() {
  return {
    feeAmount: new Prisma.Decimal("1.50"),
    feePolicy: {
      displayName: "Service fee",
      fixedAmount: new Prisma.Decimal("0.69"),
      fixedFeeApplication: "PER_TICKET" as const,
      model: "BLENDED" as const,
      percentRate: new Prisma.Decimal("0.0695"),
      responsibility: "BUYER" as const,
    },
    id: "order_123",
    currency: "NGN",
    totalAmount: new Prisma.Decimal("2500.00"),
    userEmail: "ada@example.com",
    userId: "user_123",
    event: {
      slug: "lagos-night-market",
      title: "Lagos Night Market",
    },
    items: [
      {
        quantity: 1,
        ticketType: {
          currency: "NGN",
          description: "General entry",
          name: "General Admission",
        },
        unitPrice: new Prisma.Decimal("2500.00"),
      },
    ],
  };
}

describe("PaymentsService Paystack", () => {
  const prisma = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };
  const notificationsService = {
    notifyOrderPaid: vi.fn(),
  };
  let service: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack";
    process.env.FRONTEND_APP_URL = "http://localhost:3001";
    service = new PaymentsService(prisma as never, notificationsService as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it("initializes a Paystack checkout transaction in currency subunits", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: true,
          message: "Authorization URL created",
          data: {
            authorization_url: "https://checkout.paystack.com/access-code",
            reference: "order-order123-mock",
          },
        }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await service.createPaystackCheckoutTransaction(
      createCheckoutOrder(),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(requestBody).toEqual(
      expect.objectContaining({
        amount: 250000,
        currency: "NGN",
        email: "ada@example.com",
        metadata: expect.objectContaining({
          orderId: "order_123",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        checkoutSessionId: "order-order123-mock",
        checkoutUrl: "https://checkout.paystack.com/access-code",
        paymentStatus: "pending",
      }),
    );
  });

  it("rejects Paystack webhooks with an invalid signature", async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: "charge.success" }));

    await expect(
      service.handlePaystackWebhook(rawBody, "not-a-valid-signature"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.webhookEvent.upsert).not.toHaveBeenCalled();
  });

  it("reconciles a pending Paystack order without issuing tickets before success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: true,
          message: "Verification successful",
          data: {
            amount: 250000,
            currency: "NGN",
            reference: "order-order123-mock",
            status: "pending",
          },
        }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await service.reconcilePendingOrderWithProvider({
      checkoutSessionId: "order-order123-mock",
      id: "order_123",
      paymentProvider: PaymentProvider.PAYSTACK,
      status: OrderStatus.PENDING,
    });

    expect(result).toEqual(
      expect.objectContaining({
        checkoutSessionId: "order-order123-mock",
        checkoutStatus: "pending",
        isAwaitingPaymentConfirmation: true,
        paymentStatus: "pending",
      }),
    );
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("accepts a correctly signed Paystack non-charge webhook idempotently", async () => {
    const event = {
      event: "transfer.success",
      data: {
        reference: "paystack-ref-123",
      },
    };
    const rawBody = Buffer.from(JSON.stringify(event));
    const signature = createHmac("sha512", "sk_test_paystack")
      .update(rawBody)
      .digest("hex");
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.upsert.mockResolvedValue({});
    prisma.webhookEvent.update.mockResolvedValue({});

    await expect(
      service.handlePaystackWebhook(rawBody, signature),
    ).resolves.toEqual({ received: true });
    expect(prisma.webhookEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: PaymentProvider.PAYSTACK,
          providerEventId: "paystack:transfer.success:paystack-ref-123",
        }),
      }),
    );
  });
});
