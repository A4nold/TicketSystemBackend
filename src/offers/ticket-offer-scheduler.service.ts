import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { TicketOfferExpiryService } from "./ticket-offer-expiry.service";

const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;
const MIN_SWEEP_INTERVAL_MS = 15 * 1000;

@Injectable()
export class TicketOfferSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TicketOfferSchedulerService.name);
  private intervalRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly ticketOfferExpiryService: TicketOfferExpiryService) {}

  onModuleInit() {
    const intervalMs = this.resolveSweepIntervalMs();

    this.intervalRef = setInterval(() => {
      void this.runScheduledSweep();
    }, intervalMs);

    this.logger.log(`Ticket-offer expiry sweep scheduled every ${intervalMs}ms.`);

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
      this.logger.warn("Skipping ticket-offer expiry sweep because a previous run is still in progress.");
      return;
    }

    this.isRunning = true;

    try {
      await this.ticketOfferExpiryService.trySweepExpiredOffers();
    } finally {
      this.isRunning = false;
    }
  }

  private resolveSweepIntervalMs() {
    const configuredValue = Number(
      process.env.TICKET_OFFER_SWEEP_INTERVAL_MS ?? DEFAULT_SWEEP_INTERVAL_MS,
    );

    if (!Number.isFinite(configuredValue) || configuredValue < MIN_SWEEP_INTERVAL_MS) {
      this.logger.warn(
        `Invalid TICKET_OFFER_SWEEP_INTERVAL_MS value. Falling back to ${DEFAULT_SWEEP_INTERVAL_MS}ms.`,
      );
      return DEFAULT_SWEEP_INTERVAL_MS;
    }

    return configuredValue;
  }
}

