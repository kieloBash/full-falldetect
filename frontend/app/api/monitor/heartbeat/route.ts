// location: frontend/app/api/monitor/heartbeat/route.ts
// Called by the camera laptop every ~30 s. Registers the node, records its current
// video server address (e.g. http://192.168.1.50:8002), and updates each camera's status + lastSeenAt.
// Auth: Authorization: Bearer <MONITOR_INGEST_SECRET> (same as ingest).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/api/errors";
import { isMachineAuthorized } from "@/lib/detection-node-server/machine-auth";
import { parseHeartbeat } from "@/lib/detection-node-server/validators";
import { effectiveSensorStatus, type UiSensorStatus } from "@/lib/detection-node-server/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SensorActivity = "SENSOR_RECONNECTED" | "SENSOR_OFFLINE" | "SENSOR_DEGRADED";

function transitionActivity(prev: UiSensorStatus, next: UiSensorStatus): SensorActivity | null {
  if (prev === next) return null;
  if (next === "online") return "SENSOR_RECONNECTED";
  if (next === "offline") return "SENSOR_OFFLINE";
  return "SENSOR_DEGRADED";
}

const ACTIVITY_MESSAGE: Record<SensorActivity, (deviceId: string, room: string) => string> = {
  SENSOR_RECONNECTED: (d, r) => `Camera ${d} in Room ${r} is back online`,
  SENSOR_OFFLINE: (d, r) => `Camera ${d} in Room ${r} went offline`,
  SENSOR_DEGRADED: (d, r) => `Camera ${d} in Room ${r} is sending frames slowly`,
};

export async function POST(req: Request) {
  if (!isMachineAuthorized(req)) return jsonError(401, "Unauthorized");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Body must be JSON");
  }
  const parsed = parseHeartbeat(body);
  if (!parsed.ok) return jsonError(400, parsed.error);
  const hb = parsed.value;
  const now = new Date();

  const sensors = await prisma.sensor.findMany({
    where: { deviceId: { in: hb.cameras.map((c) => c.deviceId) } },
    include: {
      room: { select: { id: true, label: true, floor: { select: { facilityId: true } } } },
    },
  });

  // A node belongs to one facility: the one it was first registered under,
  // otherwise the facility of the first known camera it reports.
  const existing = await prisma.detectionNode.findUnique({ where: { nodeKey: hb.nodeKey } });
  const facilityId = existing?.facilityId ?? sensors[0]?.room.floor.facilityId;
  if (!facilityId) {
    return jsonError(
      404,
      "None of the reported cameras match a sensor device ID. Set the Sensor ID in Admin → Rooms first.",
    );
  }
  const owned = sensors.filter((s) => s.room.floor.facilityId === facilityId && s.deviceId);
  const reported = new Map(hb.cameras.map((c) => [c.deviceId, c.status]));

  const node = await prisma.detectionNode.upsert({
    where: { nodeKey: hb.nodeKey },
    create: {
      nodeKey: hb.nodeKey,
      name: hb.name ?? hb.nodeKey,
      facilityId,
      streamBaseUrl: hb.streamBaseUrl,
      lastHeartbeatAt: now,
    },
    update: {
      ...(hb.name ? { name: hb.name } : {}),
      streamBaseUrl: hb.streamBaseUrl,
      lastHeartbeatAt: now,
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const sensor of owned) {
      const deviceId = sensor.deviceId as string;
      const next = reported.get(deviceId)!;
      const prev = effectiveSensorStatus(sensor, now.getTime());
      const activity = transitionActivity(prev, next.toLowerCase() as UiSensorStatus);

      await tx.sensor.update({
        where: { id: sensor.id },
        data: { nodeId: node.id, status: next, lastSeenAt: now },
      });
      if (activity) {
        await tx.activityLogEntry.create({
          data: {
            facilityId,
            type: activity,
            roomId: sensor.room.id,
            message: ACTIVITY_MESSAGE[activity](deviceId, sensor.room.label),
          },
        });
      }
    }
  });

  const accepted = owned.map((s) => s.deviceId as string);
  return NextResponse.json({
    nodeId: node.id,
    accepted,
    ignored: hb.cameras.map((c) => c.deviceId).filter((d) => !accepted.includes(d)),
  });
}
