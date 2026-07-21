import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { projectRoom, type RoomRow } from "@/lib/admin/server-projection";

/** GET /api/admin/rooms — all rooms across the caller's facility (flat list). */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const rows = (await prisma.room.findMany({
    where: { floor: { facilityId } },
    select: {
      id: true,
      label: true,
      floorId: true,
      sensor: { select: { deviceLabel: true, status: true } },
    },
    orderBy: { label: "asc" },
  })) as RoomRow[];

  return NextResponse.json(rows.map(projectRoom));
}

/**
 * POST /api/admin/rooms { room, sensorId, floorId } — create Room + Sensor.
 * New rooms default to a neutral zone and ONLINE sensor status.
 */
export async function POST(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { room, sensorId, floorId } = await req.json();

  if (!room || typeof room !== "string" || !room.trim()) {
    return NextResponse.json({ error: "Room number is required." }, { status: 400 });
  }
  if (!floorId) return NextResponse.json({ error: "A floor is required." }, { status: 400 });

  const floor = await prisma.floor.findFirst({ where: { id: floorId, facilityId }, select: { id: true } });
  if (!floor) return NextResponse.json({ error: "Floor not found." }, { status: 404 });

  try {
    const created = await prisma.room.create({
      data: {
        floorId,
        label: room.trim(),
        zone: "Zone A",
        sensor: { create: { deviceLabel: sensorId?.trim() || null, status: "ONLINE" as never } },
      },
      select: {
        id: true,
        label: true,
        floorId: true,
        sensor: { select: { deviceLabel: true, status: true } },
      },
    });
    return NextResponse.json(projectRoom(created as RoomRow), { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "A room with that number already exists on this floor." }, { status: 409 });
    }
    throw e;
  }
}
