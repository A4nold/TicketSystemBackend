import { Prisma, SettlementState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerPaymentsQueryService } from "./organizer-payments-query.service";

describe("OrganizerPaymentsQueryService", () => {
  const paymentAccountRepository = {
    findOrganizerPaymentProfile: vi.fn(),
    findStripeAccountByOrganizerId: vi.fn(),
  };
  const paymentTransactionRepository = {
    listByOrganizerId: vi.fn(),
  };
  const refundRepository = {
    listByOrganizerId: vi.fn(),
  };
  const disputeRepository = {
    listByOrganizerId: vi.fn(),
  };
  const organizerEarningRepository = {
    listByOrganizerId: vi.fn(),
  };

  let service: OrganizerPaymentsQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizerPaymentsQueryService(
      paymentAccountRepository as never,
      paymentTransactionRepository as never,
      refundRepository as never,
      disputeRepository as never,
      organizerEarningRepository as never,
    );
  });

  it("lists organizer refunds with event context", async () => {
    refundRepository.listByOrganizerId.mockResolvedValue([
      {
        amount: new Prisma.Decimal("5.00"),
        createdAt: new Date("2026-06-05T10:00:00.000Z"),
        currency: "EUR",
        id: "refund_1",
        orderId: "order_1",
        paymentTransaction: {
          event: {
            title: "Campus Neon",
          },
          eventId: "event_1",
        },
        paymentTransactionId: "pt_1",
        processedAt: new Date("2026-06-05T10:00:01.000Z"),
        providerRefundId: "re_1",
        reason: "requested_by_customer",
        refundApplicationFee: false,
        requestedAt: new Date("2026-06-05T10:00:00.000Z"),
        reverseTransfer: true,
        status: "SUCCEEDED",
      },
    ]);

    const result = await service.listOrganizerRefunds("org_1", 10);

    expect(result).toEqual([
      expect.objectContaining({
        amount: "5.00",
        eventTitle: "Campus Neon",
        id: "refund_1",
        paymentTransactionId: "pt_1",
      }),
    ]);
  });

  it("lists organizer disputes with event context", async () => {
    disputeRepository.listByOrganizerId.mockResolvedValue([
      {
        amount: new Prisma.Decimal("16.50"),
        closedAt: null,
        createdAt: new Date("2026-06-05T11:00:00.000Z"),
        currency: "EUR",
        evidenceDueBy: new Date("2026-06-12T11:00:00.000Z"),
        id: "dispute_1",
        lostAt: null,
        needsResponse: true,
        paymentTransaction: {
          event: {
            title: "Campus Neon",
          },
          eventId: "event_1",
        },
        paymentTransactionId: "pt_1",
        providerChargeId: "ch_1",
        providerDisputeId: "dp_1",
        reason: "fraudulent",
        status: "warning_needs_response",
        wonAt: null,
      },
    ]);

    const result = await service.listOrganizerDisputes("org_1", 10);

    expect(result).toEqual([
      expect.objectContaining({
        amount: "16.50",
        eventTitle: "Campus Neon",
        id: "dispute_1",
        needsResponse: true,
      }),
    ]);
  });

  it("builds payout visibility aggregates", async () => {
    paymentTransactionRepository.listByOrganizerId.mockResolvedValue([
      {
        createdAt: new Date("2026-06-05T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("100.00"),
        organizerNetAmount: new Prisma.Decimal("90.00"),
        platformFeeAmount: new Prisma.Decimal("10.00"),
        settlementState: SettlementState.PENDING,
        status: "SUCCEEDED",
      },
      {
        createdAt: new Date("2026-06-04T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("50.00"),
        organizerNetAmount: new Prisma.Decimal("45.00"),
        platformFeeAmount: new Prisma.Decimal("5.00"),
        settlementState: SettlementState.ON_HOLD,
        status: "PROCESSING",
      },
    ]);
    organizerEarningRepository.listByOrganizerId.mockResolvedValue([
      {
        currency: "EUR",
        netAmount: new Prisma.Decimal("90.00"),
        settlementState: SettlementState.PENDING,
      },
      {
        currency: "EUR",
        netAmount: new Prisma.Decimal("45.00"),
        settlementState: SettlementState.ON_HOLD,
      },
      {
        currency: "EUR",
        netAmount: new Prisma.Decimal("25.00"),
        settlementState: SettlementState.SETTLED,
      },
    ]);
    refundRepository.listByOrganizerId.mockResolvedValue([
      {
        amount: new Prisma.Decimal("5.00"),
        currency: "EUR",
        status: "SUCCEEDED",
      },
    ]);
    disputeRepository.listByOrganizerId.mockResolvedValue([
      {
        amount: new Prisma.Decimal("16.50"),
        currency: "EUR",
      },
    ]);

    const result = await service.getOrganizerPayoutVisibility("org_1");

    expect(result).toEqual(
      expect.objectContaining({
        currency: "EUR",
        disputeCount: 1,
        disputeExposureAmount: "16.50",
        grossSales: "100.00",
        netEarnings: "90.00",
        onHoldAmount: "45.00",
        pendingSettlement: "90.00",
        platformFees: "10.00",
        refundCount: 1,
        refundedAmount: "5.00",
        settledAmount: "25.00",
        successfulTransactionCount: 1,
      }),
    );
  });
});
