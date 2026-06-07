export function paymentTransactionDetailInclude() {
  return {
    event: true,
    order: {
      include: {
        items: {
          include: {
            ticketType: true,
          },
          orderBy: {
            createdAt: "asc" as const,
          },
        },
      },
    },
    resaleListing: true,
    platformFees: {
      orderBy: {
        createdAt: "asc" as const,
      },
    },
    refunds: {
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    disputes: {
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    organizerEarnings: {
      orderBy: {
        createdAt: "desc" as const,
      },
    },
  };
}
