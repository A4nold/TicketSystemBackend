import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ListEventSalesQueryDto } from "./dto/list-event-sales-query.dto";

@Injectable()
export class EventSalesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventSales(
    eventId: string,
    query: ListEventSalesQueryDto = {},
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" was not found.`);
    }

    const limit = query.limit ?? 20;
    const take = limit + 1;

    const [transactions, salesAggregate, refundsAggregate, paidOrders] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: {
          eventId,
        },
        orderBy: {
          createdAt: "desc",
        },
        cursor: query.cursor ? { id: query.cursor } : undefined,
        skip: query.cursor ? 1 : 0,
        take,
        include: {
          order: {
            include: {
              items: {
                include: {
                  ticketType: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          eventId,
          status: "SUCCEEDED",
        },
        _sum: {
          grossAmount: true,
          organizerNetAmount: true,
          platformFeeAmount: true,
        },
      }),
      this.prisma.refund.aggregate({
        where: {
          paymentTransaction: {
            eventId,
          },
          status: "SUCCEEDED",
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          eventId,
          paidAt: {
            not: null,
          },
        },
        include: {
          items: {
            include: {
              ticketType: true,
            },
          },
        },
      }),
    ]);

    const hasMore = transactions.length > limit;
    const pageTransactions = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? pageTransactions[pageTransactions.length - 1]?.id ?? null : null;

    const currency =
      pageTransactions.find((transaction) => transaction.status === "SUCCEEDED")?.currency ??
      pageTransactions[0]?.currency ??
      "EUR";

    const ticketsSold = paidOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    const grossRevenue = salesAggregate._sum.grossAmount ?? new Prisma.Decimal(0);
    const platformFees = salesAggregate._sum.platformFeeAmount ?? new Prisma.Decimal(0);
    const estimatedOrganizerEarnings =
      salesAggregate._sum.organizerNetAmount ?? new Prisma.Decimal(0);
    const refundedAmount = refundsAggregate._sum.amount ?? new Prisma.Decimal(0);
    const ticketTypeBreakdownMap = new Map<
      string,
      {
        currency: string;
        grossRevenue: Prisma.Decimal;
        quantitySold: number;
        ticketTypeId: string;
        ticketTypeName: string;
      }
    >();

    for (const order of paidOrders) {
      for (const item of order.items) {
        const existing = ticketTypeBreakdownMap.get(item.ticketTypeId);

        if (existing) {
          existing.grossRevenue = existing.grossRevenue.add(item.totalPrice);
          existing.quantitySold += item.quantity;
          continue;
        }

        ticketTypeBreakdownMap.set(item.ticketTypeId, {
          currency: item.ticketType.currency,
          grossRevenue: new Prisma.Decimal(item.totalPrice),
          quantitySold: item.quantity,
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.ticketType.name,
        });
      }
    }

    const ticketTypeBreakdown = Array.from(ticketTypeBreakdownMap.values())
      .sort((left, right) => right.quantitySold - left.quantitySold)
      .map((entry) => ({
        currency: entry.currency,
        grossRevenue: entry.grossRevenue.toFixed(2),
        quantitySold: entry.quantitySold,
        ticketTypeId: entry.ticketTypeId,
        ticketTypeName: entry.ticketTypeName,
      }));

    return {
      recentTransactions: pageTransactions.map((transaction) => ({
        createdAt: transaction.createdAt,
        currency: transaction.currency,
        grossAmount: transaction.grossAmount.toFixed(2),
        id: transaction.id,
        orderId: transaction.orderId,
        organizerNetAmount: transaction.organizerNetAmount.toFixed(2),
        platformFeeAmount: transaction.platformFeeAmount.toFixed(2),
        provider: transaction.provider,
        status: transaction.status,
        ticketCount:
          transaction.order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      })),
      summary: {
        currency,
        estimatedOrganizerEarnings: estimatedOrganizerEarnings.toFixed(2),
        grossRevenue: grossRevenue.toFixed(2),
        platformFees: platformFees.toFixed(2),
        refundedAmount: refundedAmount.toFixed(2),
        ticketsSold,
      },
      ticketTypeBreakdown,
      nextCursor,
    };
  }
}
