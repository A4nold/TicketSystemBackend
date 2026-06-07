import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventSalesQueryService } from "./event-sales-query.service";

describe("EventSalesQueryService", () => {
  const prisma = {
    event: {
      findUnique: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    paymentTransaction: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    refund: {
      aggregate: vi.fn(),
    },
  };

  let service: EventSalesQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventSalesQueryService(prisma as never);
  });

  it("builds an event sales summary with recent transactions", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event_1" });
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-06T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("100.00"),
        id: "pt_1",
        order: {
          items: [
            {
              quantity: 2,
              ticketType: {
                currency: "EUR",
                name: "General admission",
              },
              ticketTypeId: "tt_ga",
              totalPrice: new Prisma.Decimal("60.00"),
            },
            {
              quantity: 1,
              ticketType: {
                currency: "EUR",
                name: "VIP",
              },
              ticketTypeId: "tt_vip",
              totalPrice: new Prisma.Decimal("40.00"),
            },
          ],
        },
        orderId: "order_1",
        organizerNetAmount: new Prisma.Decimal("90.00"),
        platformFeeAmount: new Prisma.Decimal("10.00"),
        status: "SUCCEEDED",
      },
      {
        createdAt: new Date("2026-06-05T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("50.00"),
        id: "pt_2",
        order: {
          items: [
            {
              quantity: 1,
              ticketType: {
                currency: "EUR",
                name: "General admission",
              },
              ticketTypeId: "tt_ga",
              totalPrice: new Prisma.Decimal("50.00"),
            },
          ],
        },
        orderId: "order_2",
        organizerNetAmount: new Prisma.Decimal("45.00"),
        platformFeeAmount: new Prisma.Decimal("5.00"),
        status: "PROCESSING",
      },
    ]);
    prisma.paymentTransaction.aggregate.mockResolvedValue({
      _sum: {
        grossAmount: new Prisma.Decimal("100.00"),
        organizerNetAmount: new Prisma.Decimal("90.00"),
        platformFeeAmount: new Prisma.Decimal("10.00"),
      },
    });
    prisma.refund.aggregate.mockResolvedValue({
      _sum: {
        amount: new Prisma.Decimal("5.00"),
      },
    });
    prisma.order.findMany.mockResolvedValue([
      {
        items: [
          {
            quantity: 2,
            ticketType: {
              currency: "EUR",
              name: "General admission",
            },
            ticketTypeId: "tt_ga",
            totalPrice: new Prisma.Decimal("60.00"),
          },
          {
            quantity: 1,
            ticketType: {
              currency: "EUR",
              name: "VIP",
            },
            ticketTypeId: "tt_vip",
            totalPrice: new Prisma.Decimal("40.00"),
          },
        ],
      },
    ]);

    const result = await service.getEventSales("event_1");

    expect(result.summary).toEqual({
      currency: "EUR",
      estimatedOrganizerEarnings: "90.00",
      grossRevenue: "100.00",
      platformFees: "10.00",
      refundedAmount: "5.00",
      ticketsSold: 3,
    });
    expect(result.recentTransactions[0]).toEqual(
      expect.objectContaining({
        grossAmount: "100.00",
        id: "pt_1",
        ticketCount: 3,
      }),
    );
    expect(result.ticketTypeBreakdown).toEqual([
      {
        currency: "EUR",
        grossRevenue: "60.00",
        quantitySold: 2,
        ticketTypeId: "tt_ga",
        ticketTypeName: "General admission",
      },
      {
        currency: "EUR",
        grossRevenue: "40.00",
        quantitySold: 1,
        ticketTypeId: "tt_vip",
        ticketTypeName: "VIP",
      },
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it("keeps summary totals accurate while paginating recent transactions", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event_1" });
    prisma.paymentTransaction.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-06T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("100.00"),
        id: "pt_1",
        order: {
          items: [{ quantity: 2 }],
        },
        orderId: "order_1",
        organizerNetAmount: new Prisma.Decimal("90.00"),
        platformFeeAmount: new Prisma.Decimal("10.00"),
        status: "SUCCEEDED",
      },
      {
        createdAt: new Date("2026-06-05T12:00:00.000Z"),
        currency: "EUR",
        grossAmount: new Prisma.Decimal("40.00"),
        id: "pt_2",
        order: {
          items: [{ quantity: 1 }],
        },
        orderId: "order_2",
        organizerNetAmount: new Prisma.Decimal("36.00"),
        platformFeeAmount: new Prisma.Decimal("4.00"),
        status: "SUCCEEDED",
      },
    ]);
    prisma.paymentTransaction.aggregate.mockResolvedValue({
      _sum: {
        grossAmount: new Prisma.Decimal("140.00"),
        organizerNetAmount: new Prisma.Decimal("126.00"),
        platformFeeAmount: new Prisma.Decimal("14.00"),
      },
    });
    prisma.refund.aggregate.mockResolvedValue({
      _sum: {
        amount: new Prisma.Decimal("0.00"),
      },
    });
    prisma.order.findMany.mockResolvedValue([
      {
        items: [
          {
            quantity: 2,
            ticketType: {
              currency: "EUR",
              name: "General admission",
            },
            ticketTypeId: "tt_ga",
            totalPrice: new Prisma.Decimal("100.00"),
          },
        ],
      },
      {
        items: [
          {
            quantity: 1,
            ticketType: {
              currency: "EUR",
              name: "VIP",
            },
            ticketTypeId: "tt_vip",
            totalPrice: new Prisma.Decimal("40.00"),
          },
        ],
      },
    ]);

    const result = await service.getEventSales("event_1", { limit: 1 });

    expect(result.summary).toEqual({
      currency: "EUR",
      estimatedOrganizerEarnings: "126.00",
      grossRevenue: "140.00",
      platformFees: "14.00",
      refundedAmount: "0.00",
      ticketsSold: 3,
    });
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0]?.id).toBe("pt_1");
    expect(result.nextCursor).toBe("pt_1");
  });
});
