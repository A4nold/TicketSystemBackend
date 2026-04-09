require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organizer = await prisma.user.findUnique({
    where: { email: "organizer@campusnight.ie" },
  });
  const scanner = await prisma.user.findUnique({
    where: { email: "scanner@campusnight.ie" },
  });

  if (!organizer || !scanner) {
    throw new Error(
      "Required production users were not found. Expected organizer@campusnight.ie and scanner@campusnight.ie.",
    );
  }

  await prisma.user.update({
    where: { id: organizer.id },
    data: { accountType: "ORGANIZER" },
  });

  await prisma.user.update({
    where: { id: scanner.id },
    data: { accountType: "ATTENDEE" },
  });

  const event = await prisma.event.upsert({
    where: { slug: "production-bootstrap" },
    update: {
      organizerId: organizer.id,
      title: "Production Bootstrap",
      description: "Minimal bootstrap event used to restore organizer and scanner access after a production-safe reset.",
      venueName: "Back Office",
      venueAddress: "Internal",
      timezone: "Europe/Dublin",
      startsAt: new Date("2026-12-31T10:00:00.000Z"),
      endsAt: new Date("2026-12-31T18:00:00.000Z"),
      status: "DRAFT",
      allowResale: false,
    },
    create: {
      organizerId: organizer.id,
      title: "Production Bootstrap",
      slug: "production-bootstrap",
      description: "Minimal bootstrap event used to restore organizer and scanner access after a production-safe reset.",
      venueName: "Back Office",
      venueAddress: "Internal",
      timezone: "Europe/Dublin",
      startsAt: new Date("2026-12-31T10:00:00.000Z"),
      endsAt: new Date("2026-12-31T18:00:00.000Z"),
      status: "DRAFT",
      allowResale: false,
    },
  });

  const acceptedAt = new Date();

  const organizerMembership = await prisma.staffMembership.upsert({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: organizer.id,
      },
    },
    update: {
      role: "ADMIN",
      invitedAt: acceptedAt,
      acceptedAt,
    },
    create: {
      eventId: event.id,
      userId: organizer.id,
      role: "ADMIN",
      invitedAt: acceptedAt,
      acceptedAt,
    },
  });

  const scannerMembership = await prisma.staffMembership.upsert({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: scanner.id,
      },
    },
    update: {
      role: "SCANNER",
      invitedAt: acceptedAt,
      acceptedAt,
    },
    create: {
      eventId: event.id,
      userId: scanner.id,
      role: "SCANNER",
      invitedAt: acceptedAt,
      acceptedAt,
    },
  });

  console.log("Production membership bootstrap complete.");
  console.log(
    JSON.stringify(
      {
        event: {
          id: event.id,
          slug: event.slug,
          status: event.status,
        },
        memberships: [
          {
            email: organizer.email,
            role: organizerMembership.role,
            eventId: organizerMembership.eventId,
          },
          {
            email: scanner.email,
            role: scannerMembership.role,
            eventId: scannerMembership.eventId,
          },
        ],
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
