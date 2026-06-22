import { describe, expect, it } from "vitest";

import { getCheckoutReturnFailureCopy } from "./checkout-return-state";

describe("getCheckoutReturnFailureCopy", () => {
  it("returns a lookup-error message when recovery data exists but refresh failed", () => {
    expect(
      getCheckoutReturnFailureCopy({
        hasRecoveryIdentifier: true,
        isLookupError: true,
        mode: "success",
      }),
    ).toContain("could not refresh the latest order state");
  });

  it("returns an unmatched-return message when recovery data exists without a lookup error", () => {
    expect(
      getCheckoutReturnFailureCopy({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
      }),
    ).toContain("could not match it to an in-app order");
  });

  it("returns a missing-context payment message on success when no recovery data exists", () => {
    expect(
      getCheckoutReturnFailureCopy({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "success",
      }),
    ).toContain("did not receive enough payment return details");
  });

  it("returns the generic fallback when no recovery data exists on cancel", () => {
    expect(
      getCheckoutReturnFailureCopy({
        hasRecoveryIdentifier: false,
        isLookupError: false,
        mode: "cancel",
      }),
    ).toContain("reopen discovery");
  });

  it("returns cancelled-order copy when the order resolves as cancelled", () => {
    expect(
      getCheckoutReturnFailureCopy({
        hasRecoveryIdentifier: true,
        isLookupError: false,
        mode: "success",
        status: "CANCELLED",
      }),
    ).toContain("did not complete");
  });
});
