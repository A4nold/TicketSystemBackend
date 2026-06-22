import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { PaymentsReturnsController } from "./payments-returns.controller";

describe("PaymentsReturnsController", () => {
  const controller = new PaymentsReturnsController();

  it("builds a safe mobile deep link from scheme/path and preserves Stripe return params", () => {
    const result = controller.handleStripeReturn(
      undefined,
      "ticketsystem",
      "/checkout/success",
      undefined,
      {
        payment_intent: "pi_123",
        payment_intent_client_secret: "pi_123_secret_456",
        redirect_status: "succeeded",
      },
    );

    expect(result).toEqual({
      statusCode: 302,
      url:
        "ticketsystem:///checkout/success?payment_intent=pi_123&payment_intent_client_secret=pi_123_secret_456&redirect_status=succeeded",
    });
  });

  it("normalizes target deep links and keeps embedded and forwarded query params", () => {
    const result = controller.handleStripeReturn(
      "ticketsystem://checkout/success?orderId=order_123",
      undefined,
      undefined,
      undefined,
      {
        payment_intent: "pi_123",
        session_id: "cs_test_123",
        target: "ignored",
      },
    );

    expect(result).toEqual({
      statusCode: 302,
      url:
        "ticketsystem:///checkout/success?orderId=order_123&payment_intent=pi_123&session_id=cs_test_123",
    });
  });

  it("falls back to a safe https target when no mobile deep link is provided", () => {
    const result = controller.handleStripeReturn(
      undefined,
      undefined,
      undefined,
      "https://maya.app/checkout/success",
      {
        orderId: "order_123",
        session_id: "cs_test_123",
      },
    );

    expect(result).toEqual({
      statusCode: 302,
      url: "https://maya.app/checkout/success?orderId=order_123&session_id=cs_test_123",
    });
  });

  it("rejects requests without a safe target or fallback", () => {
    expect(() =>
      controller.handleStripeReturn(
        "javascript:alert(1)",
        undefined,
        undefined,
        undefined,
        { payment_intent: "pi_123" },
      ),
    ).toThrow(BadRequestException);
  });
});
