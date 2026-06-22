import { describe, expect, it } from "vitest";

import { getCheckoutReturnFailureHeading } from "./checkout-return-heading";

describe("getCheckoutReturnFailureHeading", () => {
  it("returns a lookup-error heading for success-mode recovery failures", () => {
    expect(
      getCheckoutReturnFailureHeading({
        hasRecoveryIdentifier: true,
        isLookupError: true,
        mode: "success",
      }),
    ).toEqual({
      eyebrow: "Payment return issue",
      title: "We could not refresh this purchase yet.",
    });
  });

  it("returns an unmatched-return heading for success-mode recovery misses", () => {
    expect(
      getCheckoutReturnFailureHeading({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
      }),
    ).toEqual({
      eyebrow: "Payment return received",
      title: "We could not reconnect this purchase yet.",
    });
  });

  it("returns a missing-context heading for success-mode returns without identifiers", () => {
    expect(
      getCheckoutReturnFailureHeading({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "success",
      }),
    ).toEqual({
      eyebrow: "Payment return incomplete",
      title: "We need a bit more context to confirm this purchase.",
    });
  });

  it("keeps the cancel-mode heading unchanged", () => {
    expect(
      getCheckoutReturnFailureHeading({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "cancel",
      }),
    ).toEqual({
      eyebrow: "Checkout not completed",
      title: "No charge was confirmed in the app.",
    });
  });

  it("prefers a cancelled-order heading even on success returns", () => {
    expect(
      getCheckoutReturnFailureHeading({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        status: "CANCELLED",
      }),
    ).toEqual({
      eyebrow: "Checkout not completed",
      title: "This purchase was not completed.",
    });
  });
});
