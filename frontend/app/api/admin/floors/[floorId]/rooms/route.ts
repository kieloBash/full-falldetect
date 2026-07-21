import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { SENSOR_TO_DB } from "@/lib/admin/server-projection";
import type { SensorStatus } from "@/lib/admin/types";

/**
 * POST /api/admin/floors/{floorId}/rooms — create a Room and its Sensor in one
 * transaction. Body: { room, sensorId, status }. `resident` is accepted but
 * not persisted (resident assignment is handled elsewhere).
 */
export async function POST(req: Request, { params }: { params: Promise<{ floorId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { floorId } = await params;
  const { room, sensorId, status } = await req.json();

  if (!room || typeof room !== "string" || !room.trim()) {
    return NextResponse.json({ error: "Room number is required." }, { status: 400 });
  }

  // Confirm the floor belongs to the caller's facility.
  const floor = await prisma.floor.findFirst({ where: { id: floorId, facilityId }, select: { id: true } });
  if (!floor) return NextResponse.json({ error: "Floor not found." }, { status: 404 });

  const dbStatus = SENSOR_TO_DB[(status as SensorStatus) ?? "online"] ?? "ONLINE";

  try {
    const created = await prisma.room.create({
      data: {
        floorId,
        label: room.trim(),
        zone: "Zone A",
        sensor: {
          create: {
            deviceLabel: sensorId?.trim() || null,
            status: dbStatus as never,
          },
        },
      },
      select: {
        id: true,
        label: true,
        resident: { select: { firstName: true, lastName: true } },
        sensor: { select: { deviceLabel: true, status: true } },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        room: created.label,
        resident: created.resident ? `${created.resident.firstName} ${created.resident.lastName}` : "",
        sensorId: created.sensor?.deviceLabel ?? "",
        status: (status as SensorStatus) ?? "online",
      },
      { status: 201 }
    );
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "A room with that number already exists on this floor." }, { status: 409 });
    }
    throw e;
  }
}
