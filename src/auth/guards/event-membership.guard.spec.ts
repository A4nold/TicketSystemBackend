import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { StaffRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestWithContext } from "../../common/types/request-context.type";
import type { AuthenticatedUser } from "../types/authenticated-user.type";
import { EVENT_ROLE_METADATA_KEY } from "../decorators/require-event-roles.decorator";
import { EventMembershipGuard } from "./event-membership.guard";

type GuardRequest = {
  authUser?: AuthenticatedUser;
  eventMembership?: RequestWithContext["eventMembership"];
  params: {
    eventId: string;
  };
  scannerMembership?: RequestWithContext["scannerMembership"];
};

function createExecutionContext(request: GuardRequest) {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => request as unknown as RequestWithContext,
    }),
  } as never;
}

function createAuthUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user_1",
    email: "user@example.com",
    accountType: "ATTENDEE",
    status: "ACTIVE",
    appRoles: ["attendee"],
    memberships: [],
    platformRoles: [],
    profile: {
      firstName: "Test",
      lastName: "User",
    },
    ...overrides,
  };
}

describe("EventMembershipGuard", () => {
  const prisma = {
    staffMembership: {
      findFirst: vi.fn(),
    },
  };
  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  let guard: EventMembershipGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new EventMembershipGuard(
      prisma as never,
      reflector as unknown as Reflector,
    );
  });

  it("returns true when no event roles are required", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const request: GuardRequest = {
      authUser: createAuthUser(),
      params: { eventId: "event_1" },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(prisma.staffMembership.findFirst).not.toHaveBeenCalled();
  });

  it("throws when authenticated user context is missing", async () => {
    reflector.getAllAndOverride.mockReturnValue([StaffRole.ADMIN]);
    const request: GuardRequest = {
      params: { eventId: "event_1" },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches accepted membership when the user is authorized", async () => {
    reflector.getAllAndOverride.mockReturnValue([StaffRole.ADMIN]);
    prisma.staffMembership.findFirst.mockResolvedValue({
      acceptedAt: new Date("2026-04-10T10:00:00.000Z"),
      eventId: "event_1",
      id: "membership_1",
      role: StaffRole.ADMIN,
      userId: "user_1",
    });
    const request: GuardRequest = {
      authUser: createAuthUser(),
      params: { eventId: "event_1" },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(prisma.staffMembership.findFirst).toHaveBeenCalledWith({
      where: {
        acceptedAt: {
          not: null,
        },
        eventId: "event_1",
        role: {
          in: [StaffRole.ADMIN],
        },
        userId: "user_1",
      },
      select: {
        acceptedAt: true,
        eventId: true,
        id: true,
        role: true,
        userId: true,
      },
    });
    expect(request.eventMembership).toEqual({
      acceptedAt: new Date("2026-04-10T10:00:00.000Z"),
      eventId: "event_1",
      id: "membership_1",
      role: StaffRole.ADMIN,
      userId: "user_1",
    });
    expect(request.scannerMembership).toEqual(request.eventMembership);
  });

  it("throws when no accepted membership matches the required role", async () => {
    reflector.getAllAndOverride.mockReturnValue([StaffRole.SCANNER]);
    prisma.staffMembership.findFirst.mockResolvedValue(null);
    const request: GuardRequest = {
      authUser: createAuthUser(),
      params: { eventId: "event_1" },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
