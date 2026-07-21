import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { SENSOR_TO_DB } from "@/lib/admin/server-projection";
import type { SensorStatus } from "@/lib/admin/types";

/** Confirms the room is on the given floor within the caller's facility. */
async function findScopedRoom(roomId: string, floorId: string, facilityId: string) {
  return prisma.room.findFirst({
    where: { id: roomId, floorId, floor: { facilityId } },
    select: { id: true, sensor: { select: { id: true } } },
  });
}

/**
 * PATCH /api/admin/floors/{floorId}/rooms/{roomId} — update Room + Sensor.
 * Body: { room, sensorId, status }. `resident` is accepted but not persisted.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ floorId: string; roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { floorId, roomId } = await params;
  const { room, sensorId, status } = await req.json();

  const existing = await findScopedRoom(roomId, floorId, facilityId);
  if (!existing) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const dbStatus = SENSOR_TO_DB[(status as SensorStatus) ?? "online"] ?? "ONLINE";

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(room && typeof room === "string" ? { label: room.trim() } : {}),
      sensor: existing.sensor
        ? { update: { deviceLabel: sensorId?.trim() || null, status: dbStatus as never } }
        : { create: { deviceLabel: sensorId?.trim() || null, status: dbStatus as never } },
    },
    select: {
      id: true,
      label: true,
      resident: { select: { firstName: true, lastName: true } },
      sensor: { select: { deviceLabel: true, status: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    room: updated.label,
    resident: updated.resident ? `${updated.resident.firstName} ${updated.resident.lastName}` : "",
    sensorId: updated.sensor?.deviceLabel ?? "",
    status: (status as SensorStatus) ?? "online",
  });
}

/**
 * DELETE /api/admin/floors/{floorId}/rooms/{roomId} — delete the room. The
 * sensor cascades (schema onDelete: Cascade); a linked resident is detached,
 * not deleted (schema onDelete: SetNull), so residents outlive room removal.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ floorId: string; roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { floorId, roomId } = await params;

  const existing = await findScopedRoom(roomId, floorId, facilityId);
  if (!existing) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  await prisma.room.delete({ where: { id: roomId } });
  return NextResponse.json({ ok: true });
}
