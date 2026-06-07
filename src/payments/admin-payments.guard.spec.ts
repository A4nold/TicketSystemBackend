import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { AdminPaymentsGuard } from "./admin-payments.guard";

function createExecutionContext(authUser?: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        authUser,
      }),
    }),
  } as any;
}

describe("AdminPaymentsGuard", () => {
  const guard = new AdminPaymentsGuard();

  it("allows users with PLATFORM_ADMIN", () => {
    const context = createExecutionContext({
      appRoles: ["attendee", "organizer"],
      platformRoles: ["EVENT_OWNER", "PLATFORM_ADMIN"],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects organizers without PLATFORM_ADMIN", () => {
    const context = createExecutionContext({
      appRoles: ["attendee", "organizer"],
      platformRoles: ["EVENT_OWNER"],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
