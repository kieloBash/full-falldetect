import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/** POST /api/sensors/{roomId}/reconnect — bring a room's sensor back ONLINE. */
export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { roomId } = await params;
  const { userId, facilityId } = auth.claims;

  const sensor = await prisma.sensor.findFirst({
    where: { roomId, room: { floor: { facilityId } } },
  });
  if (!sensor) return NextResponse.json({ error: "No sensor for this room." }, { status: 404 });

  await prisma.sensor.update({ where: { id: sensor.id }, data: { status: "ONLINE", lastSeenAt: new Date() } });

  await prisma.activityLogEntry.create({
    data: { facilityId, type: "SENSOR_RECONNECTED", message: `Sensor ${roomId} reconnected — back online`, roomId, actorId: userId },
  });

  return NextResponse.json({ ok: true });
}
