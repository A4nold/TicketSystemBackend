import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { EventShareAnalyticsService } from "./event-share-analytics.service";

describe("EventShareAnalyticsService", () => {
  it("stores analytics for an existing event", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event_1",
          slug: "campus-neon",
          title: "Campus Neon",
        }),
      },
      eventShareAnalytics: {
        create: vi.fn().mockResolvedValue({ id: "analytic_1" }),
      },
    };
    const service = new EventShareAnalyticsService(prisma as never);

    const result = await service.capture("event_1", {
      eventAction: "EVENT_SHARE_CLICKED",
      metadata: { method: "native-share" },
      sourceSurface: "mobile",
    });

    expect(result).toEqual({ accepted: true });
    expect(prisma.eventShareAnalytics.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventAction: "EVENT_SHARE_CLICKED",
        eventId: "event_1",
        eventName: "Campus Neon",
        eventSlug: "campus-neon",
        sourceSurface: "mobile",
      }),
    });
  });

  it("throws when event does not exist", async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      eventShareAnalytics: {
        create: vi.fn(),
      },
    };
    const service = new EventShareAnalyticsService(prisma as never);

    await expect(
      service.capture("missing_event", {
        eventAction: "PUBLIC_EVENT_PAGE_VIEWED",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.eventShareAnalytics.create).not.toHaveBeenCalled();
  });
});

