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

    const trySweepEligibleEvents = vi.fn().mockResolvedValue(undefined);
    const service = new PostEventNotificationSchedulerService({
      trySweepEligibleEvents,
    } as never);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(trySweepEligibleEvents).toHaveBeenCalled();

    service.onModuleDestroy();
  });

  it("falls back to the default interval when configured interval is too small", async () => {
    vi.useFakeTimers();
    vi.stubEnv("POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS", "1000");

    const trySweepEligibleEvents = vi.fn().mockResolvedValue(undefined);
    const service = new PostEventNotificationSchedulerService({
      trySweepEligibleEvents,
    } as never);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(trySweepEligibleEvents).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
  });
});
