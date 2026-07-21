import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { projectRoom, type RoomRow } from "@/lib/admin/server-projection";

async function scopedRoom(roomId: string, facilityId: string) {
  return prisma.room.findFirst({
    where: { id: roomId, floor: { facilityId } },
    select: { id: true, sensor: { select: { id: true } } },
  });
}

/**
 * PATCH /api/admin/rooms/{roomId} { room, sensorId, floorId } — update Room +
 * Sensor. Sensor `status` is not edited here (managed via Live Monitor /
 * reconnect); create/edit forms don't expose it.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { roomId } = await params;
  const { room, sensorId, floorId } = await req.json();

  const existing = await scopedRoom(roomId, facilityId);
  if (!existing) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  if (floorId) {
    const floor = await prisma.floor.findFirst({ where: { id: floorId, facilityId }, select: { id: true } });
    if (!floor) return NextResponse.json({ error: "Target floor not found." }, { status: 404 });
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(room && typeof room === "string" ? { label: room.trim() } : {}),
      ...(floorId ? { floorId } : {}),
      sensor: existing.sensor
        ? { update: { deviceLabel: sensorId?.trim() || null } }
        : { create: { deviceLabel: sensorId?.trim() || null, status: "ONLINE" as never } },
    },
    select: {
      id: true,
      label: true,
      floorId: true,
      sensor: { select: { deviceLabel: true, status: true } },
    },
  });

  return NextResponse.json(projectRoom(updated as RoomRow));
}

/**
 * DELETE /api/admin/rooms/{roomId} — delete the room. Sensor cascades
 * (schema onDelete: Cascade); any resident in it is detached, not deleted
 * (Room.residentId onDelete: SetNull), matching the mock's "deleting a room
 * unassigns its patient" behavior.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { roomId } = await params;

  const existing = await scopedRoom(roomId, facilityId);
  if (!existing) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  await prisma.room.delete({ where: { id: roomId } });
  return NextResponse.json({ ok: true });
}
