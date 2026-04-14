import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { PostEventNotificationSweepService } from "./post-event-notification-sweep.service";

const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MIN_SWEEP_INTERVAL_MS = 15 * 1000;

@Injectable()
export class PostEventNotificationSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostEventNotificationSchedulerService.name);
  private intervalRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly postEventNotificationSweepService: PostEventNotificationSweepService,
  ) {}

  onModuleInit() {
    const intervalMs = this.resolveSweepIntervalMs();

    this.intervalRef = setInterval(() => {
      void this.runScheduledSweep();
    }, intervalMs);

    this.logger.log(
      `Post-event notification sweep scheduled every ${intervalMs}ms.`,
    );

    void this.runScheduledSweep();
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private async runScheduledSweep() {
    if (this.isRunning) {
      this.logger.warn(
        "Skipping post-event notification sweep because a previous run is still in progress.",
      );
      return;
    }

    this.isRunning = true;

    try {
      await this.postEventNotificationSweepService.trySweepEligibleEvents();
    } finally {
      this.isRunning = false;
    }
  }

  private resolveSweepIntervalMs() {
    const configuredValue = Number(
      process.env.POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS ??
        DEFAULT_SWEEP_INTERVAL_MS,
    );

    if (!Number.isFinite(configuredValue) || configuredValue < MIN_SWEEP_INTERVAL_MS) {
      this.logger.warn(
        `Invalid POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS value. Falling back to ${DEFAULT_SWEEP_INTERVAL_MS}ms.`,
      );
      return DEFAULT_SWEEP_INTERVAL_MS;
    }

    return configuredValue;
  }
}
