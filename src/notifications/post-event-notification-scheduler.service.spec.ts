import { describe, expect, it, vi, afterEach } from "vitest";

import { PostEventNotificationSchedulerService } from "./post-event-notification-scheduler.service";

describe("PostEventNotificationSchedulerService", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("starts a scheduled sweep and runs immediately on module init", async () => {
    vi.useFakeTimers();
    vi.stubEnv("POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS", "60000");

    const preEventSweep = {
      trySweepEligibleEvents: vi.fn().mockResolvedValue(undefined),
    };
    const postEventSweep = {
      trySweepEligibleEvents: vi.fn().mockResolvedValue(undefined),
    };
    const service = new PostEventNotificationSchedulerService(
      preEventSweep as never,
      postEventSweep as never,
    );

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(preEventSweep.trySweepEligibleEvents).toHaveBeenCalled();
    expect(postEventSweep.trySweepEligibleEvents).toHaveBeenCalled();

    service.onModuleDestroy();
  });

  it("falls back to the default interval when configured interval is too small", async () => {
    vi.useFakeTimers();
    vi.stubEnv("POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS", "1000");

    const preEventSweep = {
      trySweepEligibleEvents: vi.fn().mockResolvedValue(undefined),
    };
    const postEventSweep = {
      trySweepEligibleEvents: vi.fn().mockResolvedValue(undefined),
    };
    const service = new PostEventNotificationSchedulerService(
      preEventSweep as never,
      postEventSweep as never,
    );

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(preEventSweep.trySweepEligibleEvents).toHaveBeenCalledTimes(2);
    expect(postEventSweep.trySweepEligibleEvents).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
  });
});
