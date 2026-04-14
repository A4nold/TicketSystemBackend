require("dotenv/config");

const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Passw0rd!";
const EVENT_SLUG = "campus-neon-takeover2";

async function ensureUser({
  email,
  accountType,
  firstName,
  lastName,
  phoneNumber,
}) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      accountType,
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName,
          lastName,
          phoneNumber,
        },
      },
    },
    include: {
      profile: true,
    },
  });
}

async function ensureOrder({
  userId,
  eventId,
  ticketTypeId,
  idempotencyKey,
  paymentReference,
  checkoutSessionId,
  paidAt,
  subtotalAmount,
  feeAmount,
  totalAmount,
}) {
  return prisma.order.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      userId,
      eventId,
      status: "PAID",
      currency: "EUR",
      subtotalAmount: new Prisma.Decimal(subtotalAmount),
      feeAmount: new Prisma.Decimal(feeAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      paymentProvider: "STRIPE",
      paymentReference,
      checkoutSessionId,
      idempotencyKey,
      paidAt: new Date(paidAt),
      items: {
        create: [
          {
            ticketTypeId,
            quantity: 1,
            unitPrice: new Prisma.Decimal(subtotalAmount),
            totalPrice: new Prisma.Decimal(subtotalAmount),
          },
        ],
      },
    },
  });
}

async function ensureIssuedTicket({
  eventId,
  orderId,
  ticketTypeId,
  ownerId,
  serialNumber,
  qrTokenId,
  issuedAt,
}) {
  const existingTicket = await prisma.ticket.findUnique({
    where: { serialNumber },
  });

  if (existingTicket) {
    return existingTicket;
  }

  const ticket = await prisma.ticket.create({
    data: {
      eventId,
      ticketTypeId,
      orderId,
      currentOwnerId: ownerId,
      status: "ISSUED",
      serialNumber,
      qrTokenId,
      ownershipRevision: 1,
      issuedAt: new Date(issuedAt),
    },
  });

  await prisma.ticketOwnershipHistory.create({
    data: {
      ticketId: ticket.id,
      fromUserId: null,
      toUserId: ownerId,
      changeType: "PURCHASE",
      revision: 1,
      metadata: {
        source: "campus-neon-takeover2-test-seed",
        orderId,
      },
    },
  });

  return ticket;
}

async function main() {
  const event = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    include: {
      ticketTypes: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      _count: {
        select: {
          orders: true,
          tickets: true,
        },
      },
    },
  });

  if (!event) {
    throw new Error(`Event "${EVENT_SLUG}" was not found.`);
  }

  if (event.ticketTypes.length === 0) {
    throw new Error(`Event "${EVENT_SLUG}" has no ticket types yet.`);
  }

  const primaryTicketType = event.ticketTypes[0];

  const [ada, tobi, zara] = await Promise.all([
    ensureUser({
      email: "ada@student.ie",
      accountType: "ATTENDEE",
      firstName: "Ada",
      lastName: "Eze",
      phoneNumber: "+353870000003",
    }),
    ensureUser({
      email: "tobi@student.ie",
      accountType: "ATTENDEE",
      firstName: "Tobi",
      lastName: "Adebayo",
      phoneNumber: "+353870000004",
    }),
    ensureUser({
      email: "zara@student.ie",
      accountType: "ATTENDEE",
      firstName: "Zara",
      lastName: "Murphy",
      phoneNumber: "+353870000005",
    }),
  ]);

  const [adaTransferOrder, adaResaleOrder, tobiControlOrder] = await Promise.all([
    ensureOrder({
      userId: ada.id,
      eventId: event.id,
      ticketTypeId: primaryTicketType.id,
      idempotencyKey: "cnt2-flow-order-ada-transfer",
      paymentReference: "pay_cnt2_flow_ada_transfer",
      checkoutSessionId: "cs_cnt2_flow_ada_transfer",
      paidAt: "2026-04-13T18:45:00.000Z",
      subtotalAmount: primaryTicketType.price.toString(),
      feeAmount: "1.00",
      totalAmount: new Prisma.Decimal(primaryTicketType.price).plus("1.00").toString(),
    }),
    ensureOrder({
      userId: ada.id,
      eventId: event.id,
      ticketTypeId: primaryTicketType.id,
      idempotencyKey: "cnt2-flow-order-ada-resale",
      paymentReference: "pay_cnt2_flow_ada_resale",
      checkoutSessionId: "cs_cnt2_flow_ada_resale",
      paidAt: "2026-04-13T18:46:00.000Z",
      subtotalAmount: primaryTicketType.price.toString(),
      feeAmount: "1.00",
      totalAmount: new Prisma.Decimal(primaryTicketType.price).plus("1.00").toString(),
    }),
    ensureOrder({
      userId: tobi.id,
      eventId: event.id,
      ticketTypeId: primaryTicketType.id,
      idempotencyKey: "cnt2-flow-order-tobi-control",
      paymentReference: "pay_cnt2_flow_tobi_control",
      checkoutSessionId: "cs_cnt2_flow_tobi_control",
      paidAt: "2026-04-13T18:47:00.000Z",
      subtotalAmount: primaryTicketType.price.toString(),
      feeAmount: "1.00",
      totalAmount: new Prisma.Decimal(primaryTicketType.price).plus("1.00").toString(),
    }),
  ]);

  const [transferTicket, resaleTicket, controlTicket] = await Promise.all([
    ensureIssuedTicket({
      eventId: event.id,
      orderId: adaTransferOrder.id,
      ticketTypeId: primaryTicketType.id,
      ownerId: ada.id,
      serialNumber: "CNT2-REG-0001",
      qrTokenId: "qr_cnt2_reg_0001_rev1",
      issuedAt: "2026-04-13T18:45:30.000Z",
    }),
    ensureIssuedTicket({
      eventId: event.id,
      orderId: adaResaleOrder.id,
      ticketTypeId: primaryTicketType.id,
      ownerId: ada.id,
      serialNumber: "CNT2-REG-0002",
      qrTokenId: "qr_cnt2_reg_0002_rev1",
      issuedAt: "2026-04-13T18:46:30.000Z",
    }),
    ensureIssuedTicket({
      eventId: event.id,
      orderId: tobiControlOrder.id,
      ticketTypeId: primaryTicketType.id,
      ownerId: tobi.id,
      serialNumber: "CNT2-REG-0003",
      qrTokenId: "qr_cnt2_reg_0003_rev1",
      issuedAt: "2026-04-13T18:47:30.000Z",
    }),
  ]);

  const updatedEvent = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    include: {
      _count: {
        select: {
          orders: true,
          tickets: true,
        },
      },
    },
  });

  console.log("Campus Neon Takeover 2 flow data ready.");
  console.log(
    JSON.stringify(
      {
        event: {
          slug: updatedEvent.slug,
          ticketCount: updatedEvent._count.tickets,
          orderCount: updatedEvent._count.orders,
        },
        credentials: {
          organizer: {
            email: "organizer@campusnight.ie",
            password: DEFAULT_PASSWORD,
          },
          attendees: [
            { email: ada.email, password: DEFAULT_PASSWORD },
            { email: tobi.email, password: DEFAULT_PASSWORD },
            { email: zara.email, password: DEFAULT_PASSWORD },
          ],
        },
        testTickets: {
          transferReady: {
            serialNumber: transferTicket.serialNumber,
            owner: ada.email,
            suggestedRecipient: tobi.email,
          },
          resaleReady: {
            serialNumber: resaleTicket.serialNumber,
            owner: ada.email,
            suggestedBuyer: zara.email,
          },
          control: {
            serialNumber: controlTicket.serialNumber,
            owner: tobi.email,
          },
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
