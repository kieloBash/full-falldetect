import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/**
 * POST /api/alerts — create a new ACTIVE incident (the "Simulate fall"
 * action, now persisted). Body: { roomId?, floor? }. With `roomId` it targets
 * that room; otherwise it picks a random eligible room (idle, sensor not
 * offline) on `floor`. Enforces the schema's one-open-incident-per-room rule.
 */
export async function POST(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const body = await req.json().catch(() => ({}));
  const { roomId, floor } = body as { roomId?: string; floor?: string };

  let targetRoomId = roomId;

  if (!targetRoomId) {
    const candidates = await prisma.room.findMany({
      where: {
        floor: { facilityId, ...(floor ? { label: floor } : {}) },
        sensor: { status: { not: "OFFLINE" } },
        incidents: { none: { state: { in: ["ACTIVE", "ACKNOWLEDGED"] } } },
      },
      select: { id: true, residentId: true },
    });
    if (candidates.length === 0) {
      return NextResponse.json({ error: "No available rooms to simulate." }, { status: 409 });
    }
    targetRoomId = candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  const room = await prisma.room.findFirst({
    where: { id: targetRoomId, floor: { facilityId } },
    select: { id: true, label: true, residentId: true },
  });
  if (!room || !room.residentId) {
    return NextResponse.json({ error: "Room not found or has no resident." }, { status: 404 });
  }

  const existingOpen = await prisma.incident.findFirst({
    where: { roomId: room.id, state: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
  });
  if (existingOpen) {
    return NextResponse.json({ error: "Room already has an open incident." }, { status: 409 });
  }

  const incident = await prisma.incident.create({
    data: { roomId: room.id, residentId: room.residentId, state: "ACTIVE", confidence: 98, detectedAt: new Date() },
  });

  await prisma.activityLogEntry.create({
    data: { facilityId, type: "INCIDENT_DETECTED", message: `Fall detected in Room ${room.label}`, incidentId: incident.id, roomId: room.id },
  });

  return NextResponse.json({ roomId: room.id, incidentId: incident.id }, { status: 201 });
}
