import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";

type TicketStatusMeta = {
  description: string;
  priority: number;
  tone: "accent" | "danger" | "muted" | "success" | "warning";
};

export function getTicketStatusMeta(status: string): TicketStatusMeta {
  switch (status) {
    case "ISSUED":
    case "PAID":
      return {
        description: "Ready in your wallet",
        priority: 0,
        tone: "success",
      };
    case "TRANSFER_PENDING":
      return {
        description: "Waiting for transfer acceptance",
        priority: 2,
        tone: "warning",
      };
    case "RESALE_LISTED":
      return {
        description: "Currently listed for resale",
        priority: 3,
        tone: "accent",
      };
    case "USED":
      return {
        description: "Already used for entry",
        priority: 4,
        tone: "muted",
      };
    default:
      return {
        description: "Needs attention",
        priority: 5,
        tone: "danger",
      };
  }
}

export function getSortedTickets(tickets: OwnedTicketSummary[]) {
  return [...tickets].sort((left, right) => {
    const leftMeta = getTicketStatusMeta(left.status);
    const rightMeta = getTicketStatusMeta(right.status);

    if (leftMeta.priority !== rightMeta.priority) {
      return leftMeta.priority - rightMeta.priority;
    }

    return new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime();
  });
}

export function groupTicketsByEvent(tickets: OwnedTicketSummary[]) {
  const grouped = new Map<
    string,
    {
      event: OwnedTicketSummary["event"];
      tickets: OwnedTicketSummary[];
    }
  >();

  for (const ticket of getSortedTickets(tickets)) {
    const current = grouped.get(ticket.event.id);

    if (current) {
      current.tickets.push(ticket);
      continue;
    }

    grouped.set(ticket.event.id, {
      event: ticket.event,
      tickets: [ticket],
    });
  }

  return [...grouped.values()];
}
