// location: frontend/prisma/seed-demo.ts
//
// OPTIONAL demo data for testing (additive — run AFTER the clean seed):
//   npx prisma db seed      # clean DB + admin@fall.example
//   npm run seed:demo       # this file
//   npm run seed:nodes      # optional: demo camera laptops for CAM-201/202/301
//
// Creates, in "Fall Detect Clinic":
//   floors 2 and 3
//   rooms 201 (CAM-201), 202 (CAM-202) on floor 2; 301 (CAM-301) on floor 3
//   patients: Eleanor Whitfield → 201, Harold Baptiste → 202, Walter Kim → 301
//   nurse: nurse@fall.example / password123
// Safe to run twice: existing rows with the same names/IDs are reused, not duplicated.
// No incidents are created — use Simulate Fall or the camera laptop.

import "dotenv/config";
import { PrismaClient, RiskLevel, UserRole } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROOMS = [
  { floor: "2", room: "201", deviceId: "CAM-201", patient: ["Eleanor", "Whitfield"], risk: RiskLevel.HIGH },
  { floor: "2", room: "202", deviceId: "CAM-202", patient: ["Harold", "Baptiste"], risk: RiskLevel.MEDIUM },
  { floor: "3", room: "301", deviceId: "CAM-301", patient: ["Walter", "Kim"], risk: RiskLevel.HIGH },
] as const;

async function main() {
  const facility = await prisma.facility.findFirst({ where: { name: "Fall Detect Clinic" } });
  if (!facility) throw new Error('Facility "Fall Detect Clinic" not found. Run `npx prisma db seed` first.');

  for (const r of ROOMS) {
    const floor = await prisma.floor.upsert({
      where: { facilityId_label: { facilityId: facility.id, label: r.floor } },
      update: {},
      create: { facilityId: facility.id, label: r.floor },
    });

    let resident = await prisma.resident.findFirst({
      where: { facilityId: facility.id, firstName: r.patient[0], lastName: r.patient[1] },
    });
    resident ??= await prisma.resident.create({
      data: { facilityId: facility.id, firstName: r.patient[0], lastName: r.patient[1], risk: r.risk },
    });

    const existing = await prisma.room.findUnique({
      where: { floorId_label: { floorId: floor.id, label: r.room } },
    });
    if (existing) continue;

    const deviceTaken = await prisma.sensor.findUnique({ where: { deviceId: r.deviceId } });
    await prisma.room.create({
      data: {
        floorId: floor.id,
        label: r.room,
        zone: "Zone A",
        residentId: resident.id,
        sensor: {
          create: {
            status: "ONLINE",
            deviceId: deviceTaken ? null : r.deviceId,
            deviceLabel: r.deviceId,
          },
        },
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "nurse@fall.example" },
    update: {},
    create: {
      facilityId: facility.id,
      firstName: "Nora",
      lastName: "Santos",
      email: "nurse@fall.example",
      passwordHash: await hashPassword("password123"),
      role: UserRole.NURSE,
    },
  });

  console.log("Demo seed complete:");
  console.log("  floors 2, 3 · rooms 201 (CAM-201), 202 (CAM-202), 301 (CAM-301) · 3 patients");
  console.log("  nurse: nurse@fall.example / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
