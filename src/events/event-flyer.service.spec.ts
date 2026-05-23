import { NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventFlyerService } from "./event-flyer.service";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("EventFlyerService", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1716500000000);
    vi.stubEnv("BACKEND_PUBLIC_URL", "http://localhost:3000");
    vi.stubEnv("PUBLIC_APP_URL", "http://localhost:3001");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("generates flyer metadata for all supported sizes", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          coverImageUrl: "http://localhost:3000/media/events/header.jpg",
          id: "event_1",
          organizer: {
            email: "organizer@example.com",
            profile: {
              firstName: "Ada",
              lastName: "Lovelace",
            },
          },
          slug: "campus-neon",
          startsAt: new Date("2026-05-23T18:00:00.000Z"),
          ticketTypes: [
            {
              currency: "EUR",
              price: "20.00",
            },
          ],
          timezone: "Europe/Dublin",
          title: "Campus Neon",
          venueAddress: "Dublin",
          venueName: "Student Union",
        }),
      },
    };
    const service = new EventFlyerService(prisma as never);

    const fourByFive = await service.generate("event_1", "4x5");
    const a4 = await service.generate("event_1", "A4");
    const story = await service.generate("event_1", "9x16");

    expect(fourByFive.size).toBe("4x5");
    expect(a4.size).toBe("A4");
    expect(story.size).toBe("9x16");
    expect(story.imageUrl).toContain("/media/flyers/event_1-9x16-");
  });

  it("throws when event is missing", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new EventFlyerService(prisma as never);

    await expect(service.generate("missing_event", "4x5")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

