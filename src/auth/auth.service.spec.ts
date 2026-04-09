import { UnauthorizedException } from "@nestjs/common";
import { StaffRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";

function createAuthUser(overrides?: {
  accountType?: "ATTENDEE" | "ORGANIZER";
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  memberships?: Array<{
    acceptedAt: Date | null;
    eventId: string;
    id: string;
    role: StaffRole;
  }>;
  status?: string;
}) {
  return {
    id: "user_123",
    email: overrides?.email ?? "user@example.com",
    accountType: overrides?.accountType ?? "ATTENDEE",
    status: overrides?.status ?? "ACTIVE",
    profile: {
      firstName: overrides?.firstName ?? "Test",
      lastName: overrides?.lastName ?? "User",
    },
    staffMemberships: overrides?.memberships ?? [],
  };
}

describe("AuthService", () => {
  const sign = vi.fn(() => "signed-token");
  const prisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      prisma as never,
      { sign } as never,
    );
  });

  describe("register", () => {
    it("defaults new registrations to attendee capability", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        createAuthUser({ accountType: "ATTENDEE" }),
      );

      const response = await service.register({
        email: "NewUser@example.com",
        password: "Passw0rd!",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountType: "ATTENDEE",
            email: "newuser@example.com",
          }),
        }),
      );
      expect(response.user.accountType).toBe("ATTENDEE");
      expect(response.user.platformRoles).toEqual([]);
      expect(response.user.appRoles).toEqual(["attendee"]);
    });

    it("persists organizer registrations with organizer platform capability", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        createAuthUser({ accountType: "ORGANIZER" }),
      );

      const response = await service.register({
        accountType: "ORGANIZER",
        email: "organizer@example.com",
        password: "Passw0rd!",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountType: "ORGANIZER",
          }),
        }),
      );
      expect(response.user.accountType).toBe("ORGANIZER");
      expect(response.user.platformRoles).toEqual(["EVENT_OWNER"]);
      expect(response.user.appRoles).toEqual(["attendee", "organizer"]);
      expect(sign).toHaveBeenCalledWith({
        sub: "user_123",
        email: "user@example.com",
      });
    });
  });

  describe("getMe", () => {
    it("returns organizer app access from platform capability even without memberships", async () => {
      prisma.user.findUnique.mockResolvedValue(
        createAuthUser({ accountType: "ORGANIZER", memberships: [] }),
      );

      const result = await service.getMe("user_123");

      expect(result.accountType).toBe("ORGANIZER");
      expect(result.platformRoles).toEqual(["EVENT_OWNER"]);
      expect(result.appRoles).toEqual(["attendee", "organizer"]);
      expect(result.memberships).toEqual([]);
    });

    it("does not grant scanner access for pending memberships", async () => {
      prisma.user.findUnique.mockResolvedValue(
        createAuthUser({
          memberships: [
            {
              id: "membership_1",
              eventId: "event_1",
              role: StaffRole.SCANNER,
              acceptedAt: null,
            },
          ],
        }),
      );

      const result = await service.getMe("user_123");

      expect(result.appRoles).toEqual(["attendee"]);
      expect(result.memberships).toEqual([
        {
          id: "membership_1",
          eventId: "event_1",
          role: StaffRole.SCANNER,
          acceptedAt: null,
        },
      ]);
    });

    it("grants scanner access for accepted scanner memberships", async () => {
      prisma.user.findUnique.mockResolvedValue(
        createAuthUser({
          memberships: [
            {
              id: "membership_1",
              eventId: "event_1",
              role: StaffRole.SCANNER,
              acceptedAt: new Date("2026-04-10T10:00:00.000Z"),
            },
          ],
        }),
      );

      const result = await service.getMe("user_123");

      expect(result.appRoles).toEqual(["attendee", "scanner"]);
    });

    it("throws when authenticated user cannot be found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe("missing_user")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("validateJwtUser", () => {
    it("returns identity data with platform roles and memberships", async () => {
      prisma.user.findUnique.mockResolvedValue(
        createAuthUser({
          accountType: "ORGANIZER",
          memberships: [
            {
              id: "membership_1",
              eventId: "event_1",
              role: StaffRole.ADMIN,
              acceptedAt: new Date("2026-04-10T10:00:00.000Z"),
            },
          ],
        }),
      );

      const result = await service.validateJwtUser("user_123");

      expect(result.accountType).toBe("ORGANIZER");
      expect(result.platformRoles).toEqual(["EVENT_OWNER"]);
      expect(result.appRoles).toEqual(["attendee", "organizer"]);
      expect(result.memberships).toEqual([
        {
          id: "membership_1",
          eventId: "event_1",
          role: StaffRole.ADMIN,
          acceptedAt: "2026-04-10T10:00:00.000Z",
        },
      ]);
    });
  });
});
