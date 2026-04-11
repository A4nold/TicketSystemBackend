export function ticketSummaryInclude() {
  return {
    event: true,
    ticketType: true,
    currentOwner: {
      include: {
        profile: true,
      },
    },
    scanAttempts: {
      orderBy: {
        scannedAt: "desc" as const,
      },
    },
  };
}

export function ticketDetailInclude() {
  return {
    ...ticketSummaryInclude(),
    transferRequests: {
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    resaleListings: {
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    scanAttempts: {
      orderBy: {
        scannedAt: "desc" as const,
      },
      include: {
        scanSession: true,
        scannedByUser: true,
      },
    },
    ownershipHistory: {
      orderBy: {
        createdAt: "asc" as const,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    },
  };
}
