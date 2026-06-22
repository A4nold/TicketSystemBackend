import { describe, expect, it } from "vitest";

import { getCheckoutReturnRefreshLabel } from "./checkout-return-refresh";

describe("getCheckoutReturnRefreshLabel", () => {
  it("returns the idle order refresh label", () => {
    expect(
      getCheckoutReturnRefreshLabel({
        isFetching: false,
        kind: "order",
      }),
    ).toBe("Refresh order state");
  });

  it("returns the active order refresh label", () => {
    expect(
      getCheckoutReturnRefreshLabel({
        isFetching: true,
        kind: "order",
      }),
    ).toBe("Refreshing order state");
  });

  it("returns the idle payment refresh label", () => {
    expect(
      getCheckoutReturnRefreshLabel({
        isFetching: false,
        kind: "payment",
      }),
    ).toBe("Refresh payment status");
  });

  it("returns the active payment refresh label", () => {
    expect(
      getCheckoutReturnRefreshLabel({
        isFetching: true,
        kind: "payment",
      }),
    ).toBe("Refreshing payment status");
  });
});
