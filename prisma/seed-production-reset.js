require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function clearOperationalData() {
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
}

async function main() {
  await clearOperationalData();

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { email: true },
  });

  console.log("Production-safe reset complete.");
  console.log(
    JSON.stringify(
      {
        usersPreserved: users.map((user) => user.email),
        eventsRemaining: 0,
        ticketsRemaining: 0,
        ordersRemaining: 0,
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
