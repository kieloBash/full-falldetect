// location: frontend/app/api/admin/rooms/[roomId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { normalizeDeviceId, projectRoom, ROOM_SELECT, type RoomRow } from "@/lib/admin/server-projection";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";

type Params = { params: Promise<{ roomId: string }> };

async function scopedRoom(roomId: string, facilityId: string) {
  return prisma.room.findFirst({
    where: { id: roomId, floor: { facilityId } },
    select: { id: true, label: true, floorId: true, sensor: { select: { id: true } } },
  });
}

/**
 * PATCH /api/admin/rooms/{roomId} { room, sensorId, floorId } — update Room + Sensor.
 * `sensorId` → Sensor.deviceId (fix #10). Sensor status is not edited here: it comes
 * from camera heartbeats or the Live Monitor "Reconnect" action.
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { roomId } = await params;
  const { room, sensorId, floorId } = await req.json().catch(() => ({}));

  const existing = await scopedRoom(roomId, facilityId);
  if (!existing) return jsonError(404, "Room not found.");

  if (room !== undefined && (typeof room !== "string" || !room.trim())) {
    return jsonError(400, "Room number is required.");
  }
  const deviceId = normalizeDeviceId(sensorId);
  if (sensorId !== undefined && !deviceId) return jsonError(400, "Sensor / device ID is required (e.g. CAM-201).");

  const nextFloorId: string = typeof floorId === "string" && floorId ? floorId : existing.floorId;
  if (nextFloorId !== existing.floorId) {
    const floor = await prisma.floor.findFirst({ where: { id: nextFloorId, facilityId }, select: { id: true } });
    if (!floor) return jsonError(404, "Target floor not found.");
  }

  const nextLabel = typeof room === "string" ? room.trim() : existing.label;
  const clash = await prisma.room.findFirst({
    where: { floorId: nextFloorId, label: nextLabel, id: { not: roomId } },
    select: { id: true },
  });
  if (clash) return jsonError(409, "A room with that number already exists on this floor.");

  if (deviceId) {
    const owner = await prisma.sensor.findUnique({ where: { deviceId }, select: { roomId: true } });
    if (owner && owner.roomId !== roomId) {
      return jsonError(409, `Sensor ID ${deviceId} is already assigned to another room.`);
    }
  }

  try {
    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        label: nextLabel,
        floorId: nextFloorId,
        ...(deviceId
          ? {
              sensor: existing.sensor
                ? { update: { deviceId, deviceLabel: deviceId } }
                : { create: { deviceId, deviceLabel: deviceId, status: "ONLINE" } },
            }
          : {}),
      },
      select: ROOM_SELECT,
    });
    return NextResponse.json(projectRoom(updated as RoomRow));
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "That room number or sensor ID is already in use.");
    throw e;
  }
}

/**
 * DELETE /api/admin/rooms/{roomId} — delete the room. The sensor cascades and the
 * resident is detached (Room.residentId onDelete: SetNull). Rooms with incident history
 * can't be deleted (Incident.room is Restrict): incidents are the permanent audit trail.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { roomId } = await params;

  const existing = await scopedRoom(roomId, facilityId);
  if (!existing) return jsonError(404, "Room not found.");

  const incidentCount = await prisma.incident.count({ where: { roomId } });
  if (incidentCount > 0) {
    return jsonError(
      409,
      `Room ${existing.label} has ${incidentCount} incident record${incidentCount === 1 ? "" : "s"} and can't be deleted. Incident history is kept permanently.`
    );
  }

  await prisma.room.delete({ where: { id: roomId } });
  return NextResponse.json({ ok: true });
}
