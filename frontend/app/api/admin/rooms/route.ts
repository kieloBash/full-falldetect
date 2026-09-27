// location: frontend/app/api/admin/rooms/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { normalizeDeviceId, projectRoom, ROOM_SELECT, type RoomRow } from "@/lib/admin/server-projection";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";

/** GET /api/admin/rooms — all rooms across the caller's facility (flat list). */
export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const rows = (await prisma.room.findMany({
    where: { floor: { facilityId } },
    select: ROOM_SELECT,
    orderBy: { label: "asc" },
  })) as RoomRow[];

  return NextResponse.json(rows.map(projectRoom));
}

/**
 * POST /api/admin/rooms { room, sensorId, floorId } — create Room + Sensor.
 * `sensorId` is saved to Sensor.deviceId (fix #10), the ID the camera laptop sends,
 * so the new room receives alerts and heartbeats. deviceLabel mirrors it for display.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { room, sensorId, floorId } = await req.json().catch(() => ({}));

  if (!room || typeof room !== "string" || !room.trim()) return jsonError(400, "Room number is required.");
  if (!floorId || typeof floorId !== "string") return jsonError(400, "A floor is required.");
  const deviceId = normalizeDeviceId(sensorId);
  if (!deviceId) return jsonError(400, "Sensor / device ID is required (e.g. CAM-201).");

  const floor = await prisma.floor.findFirst({ where: { id: floorId, facilityId }, select: { id: true } });
  if (!floor) return jsonError(404, "Floor not found.");

  const [sameLabel, sameDevice] = await Promise.all([
    prisma.room.findFirst({ where: { floorId, label: room.trim() }, select: { id: true } }),
    prisma.sensor.findUnique({ where: { deviceId }, select: { id: true } }),
  ]);
  if (sameLabel) return jsonError(409, "A room with that number already exists on this floor.");
  if (sameDevice) return jsonError(409, `Sensor ID ${deviceId} is already assigned to another room.`);

  try {
    const created = await prisma.room.create({
      data: {
        floorId,
        label: room.trim(),
        zone: "Zone A",
        sensor: { create: { deviceId, deviceLabel: deviceId, status: "ONLINE" } },
      },
      select: ROOM_SELECT,
    });
    return NextResponse.json(projectRoom(created as RoomRow), { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "That room number or sensor ID is already in use.");
    throw e;
  }
}
