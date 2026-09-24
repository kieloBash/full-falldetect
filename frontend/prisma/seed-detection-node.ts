// location: frontend/prisma/seed-detection-node.ts
// Additive seed for the Remote Detection Node module. Run AFTER the base seed:
//   npx prisma db seed
//   npx tsx prisma/seed-detection-node.ts          (add demo nodes)
//   npx tsx prisma/seed-detection-node.ts --reset  (remove demo nodes)
// Match the PrismaClient import to the one in your prisma/seed.ts if it differs.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_NODES = [
  {
    nodeKey: "demo-online",
    name: "Floor 2 camera laptop (demo)",
    streamBaseUrl: "http://192.168.1.250:8002",
    heartbeatAgoSec: 0,
    deviceIds: ["CAM-201", "CAM-202"],
  },
  {
    nodeKey: "demo-stale",
    name: "Floor 3 camera laptop (demo, offline)",
    streamBaseUrl: "http://192.168.1.251:8002",
    heartbeatAgoSec: 60 * 60,
    deviceIds: ["CAM-301"],
  },
];

async function reset() {
  const { count } = await prisma.detectionNode.deleteMany({
    where: { nodeKey: { in: DEMO_NODES.map((n) => n.nodeKey) } },
  });
  console.log(`Removed ${count} demo node(s). Their sensors were detached, not deleted.`);
}

async function seed() {
  const facility = await prisma.facility.findFirst({ where: { name: "Fall Detect Clinic" } });
  if (!facility) throw new Error('Facility "Fall Detect Clinic" not found. Run `npx prisma db seed` first.');

  for (const demo of DEMO_NODES) {
    const heartbeat = new Date(Date.now() - demo.heartbeatAgoSec * 1000);
    const node = await prisma.detectionNode.upsert({
      where: { nodeKey: demo.nodeKey },
      create: {
        nodeKey: demo.nodeKey,
        name: demo.name,
        facilityId: facility.id,
        streamBaseUrl: demo.streamBaseUrl,
        lastHeartbeatAt: heartbeat,
      },
      update: { streamBaseUrl: demo.streamBaseUrl, lastHeartbeatAt: heartbeat },
    });
    const { count } = await prisma.sensor.updateMany({
      where: { deviceId: { in: demo.deviceIds } },
      data: { nodeId: node.id, lastSeenAt: heartbeat, status: "ONLINE" },
    });
    console.log(`${demo.nodeKey}: linked ${count}/${demo.deviceIds.length} sensors`);
  }
  console.log(
    "Done. demo-online shows as online for 90 s, then offline (no real laptop behind it).\n" +
      "Its video address is fake, so previews show an error. Use backend/demo_stream.py or main.py for real video.",
  );
}

(process.argv.includes("--reset") ? reset() : seed())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
