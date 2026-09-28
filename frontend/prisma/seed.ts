// location: frontend/prisma/seed.ts
//
// Clean seed for WatchCare. Run with:  npx prisma db seed
//
// WIPES EVERY TABLE, then creates only:
//   - the facility "Fall Detect Clinic"
//   - one administrator: admin@fall.example / password123
//     (override with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env)
//
// Everything else — floors, rooms + sensor IDs, patients, nurse accounts — is created by
// the admin in the app. For a ready-made test setup, run the optional demo seed after this:
//   npm run seed:demo       (floors 2–3, rooms CAM-201/202/301, patients, one nurse)

import "dotenv/config";
import { PrismaClient, UserRole } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FACILITY_NAME = "Fall Detect Clinic";
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@fall.example").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "password123";

async function wipe() {
  // Children before parents, so no foreign key blocks a delete.
  await prisma.activityLogEntry.deleteMany();
  await prisma.pinnedRoom.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.detectionNode.deleteMany();
  await prisma.room.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.facility.deleteMany();
}

async function main() {
  await wipe();

  const facility = await prisma.facility.create({
    data: { name: FACILITY_NAME, timezone: "Asia/Manila" },
  });

  await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: "Facility",
      lastName: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: "Facility",
      lastName: "Nurse",
      email: "nurse@fall.example",
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: UserRole.NURSE,
      isActive: true,
    },
  });

  const counts = {
    facilities: await prisma.facility.count(),
    users: await prisma.user.count(),
    floors: await prisma.floor.count(),
    rooms: await prisma.room.count(),
    residents: await prisma.resident.count(),
    incidents: await prisma.incident.count(),
  };

  console.log("Seed complete (clean database):");
  console.log(`  facility:  ${facility.name}`);
  console.log(`  admin:     ${ADMIN_EMAIL}  (password: ${process.env.SEED_ADMIN_PASSWORD ? "from SEED_ADMIN_PASSWORD" : ADMIN_PASSWORD})`);
  console.log(
    `  counts:    ${counts.facilities} facility, ${counts.users} user, ${counts.floors} floors, ` +
    `${counts.rooms} rooms, ${counts.residents} residents, ${counts.incidents} incidents`
  );
  console.log("  next:      sign in as the admin and create floors, rooms, patients and nurse accounts,");
  console.log("             or run `npm run seed:demo` for a ready-made test setup.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
