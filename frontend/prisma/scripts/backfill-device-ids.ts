// location: frontend/prisma/scripts/backfill-device-ids.ts
// One-off data fix for fix #10. Rooms created in Admin before the fix stored their
// Sensor ID in Sensor.deviceLabel only, so ingest/heartbeat couldn't find them.
// Copies deviceLabel → deviceId where deviceId is empty.
//   npx tsx prisma/scripts/backfill-device-ids.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const sensors = await prisma.sensor.findMany({
    where: { deviceId: null, deviceLabel: { not: null } },
    select: { id: true, deviceLabel: true },
  });
  let fixed = 0;
  for (const s of sensors) {
    try {
      await prisma.sensor.update({ where: { id: s.id }, data: { deviceId: s.deviceLabel } });
      fixed += 1;
    } catch {
      console.warn(`Skipped sensor ${s.id}: device ID "${s.deviceLabel}" is already used by another sensor`);
    }
  }
  console.log(`Backfilled ${fixed} of ${sensors.length} sensor(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
