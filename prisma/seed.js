require("dotenv/config");

const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DEFAULT_PASSWORD = "Passw0rd!";

async function clearData() {
  await prisma.scanAttempt.deleteMany();
  await prisma.scanSession.deleteMany();
  await prisma.payoutRecord.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.resaleListing.deleteMany();
  await prisma.ticketOwnershipHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.staffMembership.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await clearData();

  const organizer = await prisma.user.create({
    data: {
      accountType: "ORGANIZER",
      email: "organizer@campusnight.ie",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName: "Maya",
          lastName: "Okafor",
          phoneNumber: "+353870000001",
        },
      },
    },
    include: { profile: true },
  });

  const scanner = await prisma.user.create({
    data: {
      accountType: "ATTENDEE",
      email: "scanner@campusnight.ie",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName: "Liam",
          lastName: "Byrne",
          phoneNumber: "+353870000002",
        },
      },
    },
  });

  const attendeeOne = await prisma.user.create({
    data: {
      accountType: "ATTENDEE",
      email: "ada@student.ie",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName: "Ada",
          lastName: "Eze",
          phoneNumber: "+353870000003",
        },
      },
    },
  });

  const attendeeTwo = await prisma.user.create({
    data: {
      accountType: "ATTENDEE",
      email: "tobi@student.ie",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName: "Tobi",
          lastName: "Adebayo",
          phoneNumber: "+353870000004",
        },
      },
    },
  });

  const attendeeThree = await prisma.user.create({
    data: {
      accountType: "ATTENDEE",
      email: "zara@student.ie",
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
      profile: {
        create: {
          firstName: "Zara",
          lastName: "Murphy",
          phoneNumber: "+353870000005",
        },
      },
    },
  });

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: "Campus Neon Takeover",
      slug: "campus-neon-takeover",
      description: "Private student event with fraud-resistant smart ticketing.",
      venueName: "The Dock Warehouse",
      venueAddress: "12 River Lane, Dublin",
      timezone: "Europe/Dublin",
      startsAt: new Date("2026-05-15T21:00:00.000Z"),
      endsAt: new Date("2026-05-16T02:00:00.000Z"),
      status: "PUBLISHED",
      salesStartAt: new Date("2026-04-01T10:00:00.000Z"),
      salesEndAt: new Date("2026-05-15T18:00:00.000Z"),
      allowResale: true,
      maxResalePrice: new Prisma.Decimal("25.00"),
      resaleStartsAt: new Date("2026-04-20T10:00:00.000Z"),
      resaleEndsAt: new Date("2026-05-15T16:00:00.000Z"),
      offlineManifestSalt: "seed-manifest-salt-v1",
    },
  });

  const [generalTicketType, vipTicketType] = await Promise.all([
    prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: "General Admission",
        description: "Standard event access",
        price: new Prisma.Decimal("15.00"),
        currency: "EUR",
        quantity: 400,
        maxPerOrder: 4,
        saleStartsAt: new Date("2026-04-01T10:00:00.000Z"),
        saleEndsAt: new Date("2026-05-15T18:00:00.000Z"),
        sortOrder: 1,
      },
    }),
    prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: "VIP",
        description: "Priority entry plus drink token",
        price: new Prisma.Decimal("25.00"),
        currency: "EUR",
        quantity: 80,
        maxPerOrder: 2,
        saleStartsAt: new Date("2026-04-01T10:00:00.000Z"),
        saleEndsAt: new Date("2026-05-15T18:00:00.000Z"),
        sortOrder: 2,
      },
    }),
  ]);

  const [ownerMembership, scannerMembership] = await Promise.all([
    prisma.staffMembership.create({
      data: {
        eventId: event.id,
        userId: organizer.id,
        role: "OWNER",
        invitedAt: new Date("2026-04-09T09:00:00.000Z"),
        acceptedAt: new Date("2026-04-09T09:10:00.000Z"),
      },
    }),
    prisma.staffMembership.create({
      data: {
        eventId: event.id,
        userId: scanner.id,
        role: "SCANNER",
        invitedAt: new Date("2026-05-15T17:00:00.000Z"),
        acceptedAt: new Date("2026-05-15T17:05:00.000Z"),
      },
    }),
  ]);

  const orderOne = await prisma.order.create({
    data: {
      userId: attendeeOne.id,
      eventId: event.id,
      status: "PAID",
      currency: "EUR",
      subtotalAmount: new Prisma.Decimal("30.00"),
      feeAmount: new Prisma.Decimal("2.00"),
      totalAmount: new Prisma.Decimal("32.00"),
      paymentProvider: "STRIPE",
      paymentReference: "pay_seed_001",
      checkoutSessionId: "cs_seed_001",
      idempotencyKey: "seed-order-001",
      paidAt: new Date("2026-04-12T14:05:00.000Z"),
      items: {
        create: [
          {
            ticketTypeId: generalTicketType.id,
            quantity: 2,
            unitPrice: new Prisma.Decimal("15.00"),
            totalPrice: new Prisma.Decimal("30.00"),
          },
        ],
      },
    },
    include: { items: true },
  });

  const orderTwo = await prisma.order.create({
    data: {
      userId: attendeeTwo.id,
      eventId: event.id,
      status: "PAID",
      currency: "EUR",
      subtotalAmount: new Prisma.Decimal("25.00"),
      feeAmount: new Prisma.Decimal("2.50"),
      totalAmount: new Prisma.Decimal("27.50"),
      paymentProvider: "STRIPE",
      paymentReference: "pay_seed_002",
      checkoutSessionId: "cs_seed_002",
      idempotencyKey: "seed-order-002",
      paidAt: new Date("2026-04-13T11:20:00.000Z"),
      items: {
        create: [
          {
            ticketTypeId: vipTicketType.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal("25.00"),
            totalPrice: new Prisma.Decimal("25.00"),
          },
        ],
      },
    },
    include: { items: true },
  });

  const orderThree = await prisma.order.create({
    data: {
      userId: attendeeTwo.id,
      eventId: event.id,
      status: "PAID",
      currency: "EUR",
      subtotalAmount: new Prisma.Decimal("15.00"),
      feeAmount: new Prisma.Decimal("1.50"),
      totalAmount: new Prisma.Decimal("16.50"),
      paymentProvider: "STRIPE",
      paymentReference: "pay_seed_003",
      checkoutSessionId: "cs_seed_003",
      idempotencyKey: "seed-order-003",
      paidAt: new Date("2026-04-14T13:45:00.000Z"),
      items: {
        create: [
          {
            ticketTypeId: generalTicketType.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal("15.00"),
            totalPrice: new Prisma.Decimal("15.00"),
          },
        ],
      },
    },
    include: { items: true },
  });

  const ticketOne = await prisma.ticket.create({
    data: {
      eventId: event.id,
      ticketTypeId: generalTicketType.id,
      orderId: orderOne.id,
      currentOwnerId: attendeeOne.id,
      status: "ISSUED",
      serialNumber: "CNT-GA-0001",
      qrTokenId: "qr_seed_ga_0001",
      ownershipRevision: 1,
      issuedAt: new Date("2026-04-12T14:06:00.000Z"),
    },
  });

  const ticketTwo = await prisma.ticket.create({
    data: {
      eventId: event.id,
      ticketTypeId: generalTicketType.id,
      orderId: orderOne.id,
      currentOwnerId: attendeeOne.id,
      status: "TRANSFER_PENDING",
      serialNumber: "CNT-GA-0002",
      qrTokenId: "qr_seed_ga_0002_rev2",
      ownershipRevision: 2,
      issuedAt: new Date("2026-04-12T14:06:00.000Z"),
    },
  });

  const ticketThree = await prisma.ticket.create({
    data: {
      eventId: event.id,
      ticketTypeId: vipTicketType.id,
      orderId: orderTwo.id,
      currentOwnerId: attendeeTwo.id,
      status: "USED",
      serialNumber: "CNT-VIP-0001",
      qrTokenId: "qr_seed_vip_0001",
      ownershipRevision: 1,
      issuedAt: new Date("2026-04-13T11:21:00.000Z"),
      usedAt: new Date("2026-05-15T21:12:00.000Z"),
    },
  });

  const ticketFour = await prisma.ticket.create({
    data: {
      eventId: event.id,
      ticketTypeId: generalTicketType.id,
      orderId: orderThree.id,
      currentOwnerId: attendeeTwo.id,
      status: "RESALE_LISTED",
      serialNumber: "CNT-GA-0003",
      qrTokenId: "qr_seed_ga_0003_rev1",
      ownershipRevision: 1,
      issuedAt: new Date("2026-04-14T13:46:00.000Z"),
    },
  });

  await prisma.ticketOwnershipHistory.createMany({
    data: [
      {
        ticketId: ticketOne.id,
        fromUserId: null,
        toUserId: attendeeOne.id,
        changeType: "PURCHASE",
        revision: 1,
        metadata: { source: "checkout", orderId: orderOne.id },
      },
      {
        ticketId: ticketTwo.id,
        fromUserId: null,
        toUserId: attendeeOne.id,
        changeType: "PURCHASE",
        revision: 1,
        metadata: { source: "checkout", orderId: orderOne.id },
      },
      {
        ticketId: ticketThree.id,
        fromUserId: null,
        toUserId: attendeeTwo.id,
        changeType: "PURCHASE",
        revision: 1,
        metadata: { source: "checkout", orderId: orderTwo.id },
      },
      {
        ticketId: ticketFour.id,
        fromUserId: null,
        toUserId: attendeeTwo.id,
        changeType: "PURCHASE",
        revision: 1,
        metadata: { source: "checkout", orderId: orderThree.id },
      },
      {
        ticketId: ticketFour.id,
        fromUserId: attendeeTwo.id,
        toUserId: attendeeTwo.id,
        changeType: "RESALE_LISTED",
        revision: 1,
        metadata: { source: "resale_listing" },
      },
    ],
  });

  await prisma.transferRequest.create({
    data: {
      ticketId: ticketTwo.id,
      senderUserId: attendeeOne.id,
      recipientUserId: attendeeTwo.id,
      recipientEmail: attendeeTwo.email,
      status: "PENDING",
      transferToken: "transfer_seed_001",
      message: "Sending you my spare ticket.",
      expiresAt: new Date("2026-05-14T23:59:59.000Z"),
    },
  });

  const resaleListing = await prisma.resaleListing.create({
    data: {
      ticketId: ticketFour.id,
      sellerUserId: attendeeTwo.id,
      eventId: event.id,
      askingPrice: new Prisma.Decimal("18.00"),
      currency: "EUR",
      status: "LISTED",
      paymentProvider: "STRIPE",
      saleReference: "resale_seed_001",
      listedAt: new Date("2026-05-01T09:00:00.000Z"),
      expiresAt: new Date("2026-05-15T16:00:00.000Z"),
    },
  });

  const scanSession = await prisma.scanSession.create({
    data: {
      eventId: event.id,
      staffMembershipId: scannerMembership.id,
      startedByUserId: scanner.id,
      deviceLabel: "Front Gate iPhone",
      deviceFingerprint: "seed-device-front-gate",
      mode: "ONLINE",
      manifestVersion: 1,
      lastSyncedAt: new Date("2026-05-15T21:10:00.000Z"),
      startedAt: new Date("2026-05-15T21:00:00.000Z"),
    },
  });

  await prisma.scanAttempt.createMany({
    data: [
      {
        eventId: event.id,
        ticketId: ticketThree.id,
        scanSessionId: scanSession.id,
        staffMembershipId: scannerMembership.id,
        scannedByUserId: scanner.id,
        scannedQrTokenId: ticketThree.qrTokenId,
        scannedRevision: ticketThree.ownershipRevision,
        outcome: "VALID",
        reasonCode: "first_entry",
        scannedAt: new Date("2026-05-15T21:12:00.000Z"),
      },
      {
        eventId: event.id,
        ticketId: ticketThree.id,
        scanSessionId: scanSession.id,
        staffMembershipId: scannerMembership.id,
        scannedByUserId: scanner.id,
        scannedQrTokenId: ticketThree.qrTokenId,
        scannedRevision: ticketThree.ownershipRevision,
        outcome: "ALREADY_USED",
        reasonCode: "duplicate_scan",
        scannedAt: new Date("2026-05-15T21:13:10.000Z"),
      },
      {
        eventId: event.id,
        ticketId: null,
        scanSessionId: scanSession.id,
        staffMembershipId: scannerMembership.id,
        scannedByUserId: scanner.id,
        scannedQrTokenId: "qr_seed_invalid_404",
        scannedRevision: 1,
        outcome: "INVALID",
        reasonCode: "unknown_qr",
        scannedAt: new Date("2026-05-15T21:15:00.000Z"),
      },
    ],
  });

  await prisma.payoutRecord.createMany({
    data: [
      {
        eventId: event.id,
        orderId: orderOne.id,
        paymentProvider: "STRIPE",
        payoutReference: "payout_seed_001",
        grossAmount: new Prisma.Decimal("32.00"),
        feeAmount: new Prisma.Decimal("2.00"),
        netAmount: new Prisma.Decimal("30.00"),
        currency: "EUR",
        status: "PENDING",
        scheduledAt: new Date("2026-05-17T10:00:00.000Z"),
      },
      {
        eventId: event.id,
        resaleListingId: resaleListing.id,
        paymentProvider: "STRIPE",
        payoutReference: "payout_seed_002",
        grossAmount: new Prisma.Decimal("18.00"),
        feeAmount: new Prisma.Decimal("1.50"),
        netAmount: new Prisma.Decimal("16.50"),
        currency: "EUR",
        status: "PENDING",
        scheduledAt: new Date("2026-05-17T10:00:00.000Z"),
      },
    ],
  });

  await prisma.webhookEvent.create({
    data: {
      eventId: event.id,
      provider: "STRIPE",
      providerEventId: "evt_seed_checkout_completed_001",
      eventType: "checkout.session.completed",
      payload: {
        checkoutSessionId: "cs_seed_001",
        paymentReference: "pay_seed_001",
      },
      processedAt: new Date("2026-04-12T14:05:30.000Z"),
    },
  });

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        organizer: organizer.email,
        scanner: scanner.email,
        attendees: [attendeeOne.email, attendeeTwo.email, attendeeThree.email],
        event: event.slug,
        ticketTypes: [generalTicketType.name, vipTicketType.name],
        sampleStates: {
          issued: "CNT-GA-0001",
          transferPending: "CNT-GA-0002",
          used: "CNT-VIP-0001",
          resaleListed: "CNT-GA-0003",
        },
        defaultPassword: DEFAULT_PASSWORD,
      },
      null,
      2
    )
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
