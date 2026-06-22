import { describe, expect, it } from "vitest";

import { getCheckoutReturnScreenChrome } from "./checkout-return-screen-chrome";

describe("getCheckoutReturnScreenChrome", () => {
  it("returns sign-in chrome when the user is signed out", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        signedIn: false,
        status: "PAID",
      }),
    ).toEqual({
      subtitle: "Sign in again to reconnect this checkout result with your attendee wallet.",
      title: "Sign in required",
    });
  });

  it("returns confirmed chrome for paid success returns", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        signedIn: true,
        status: "PAID",
      }),
    ).toEqual({
      subtitle: "Your latest backend order state is confirmed and ready in the app.",
      title: "Payment confirmed",
    });
  });

  it("returns pending chrome for pending success returns", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        signedIn: true,
        status: "PENDING",
      }),
    ).toEqual({
      subtitle: "We are still confirming the latest backend payment state for this order.",
      title: "Checking payment",
    });
  });

  it("returns cancelled chrome when a success return resolves to a cancelled order", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        signedIn: true,
        status: "CANCELLED",
      }),
    ).toEqual({
      subtitle: "This checkout did not complete, and no paid order was restored from this return.",
      title: "Checkout not completed",
    });
  });

  it("returns issue chrome for lookup failures with recovery data", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: true,
        isLookupError: true,
        mode: "success",
        signedIn: true,
        status: null,
      }),
    ).toEqual({
      subtitle:
        "Maya has your payment return details but could not refresh the latest order state yet.",
      title: "Payment return issue",
    });
  });

  it("returns incomplete chrome for success returns without identifiers", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "success",
        signedIn: true,
        status: null,
      }),
    ).toEqual({
      subtitle:
        "Maya did not receive enough return details to reconnect this payment automatically.",
      title: "Payment return incomplete",
    });
  });

  it("keeps cancel chrome unchanged", () => {
    expect(
      getCheckoutReturnScreenChrome({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "cancel",
        signedIn: true,
        status: null,
      }),
    ).toEqual({
      subtitle:
        "We are checking whether this checkout was cancelled or still needs confirmation.",
      title: "Checkout not completed",
    });
  });
});
