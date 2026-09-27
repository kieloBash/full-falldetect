// location: frontend/app/api/alerts/route.ts
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

const OPEN_STATES = ["ACTIVE", "ACKNOWLEDGED"] as const;

/**
 * POST /api/alerts — the "Simulate fall" action. Body: { roomId?, floor? }.
 *  - `roomId`: simulate in that room (must be in the caller's facility — fix #12).
 *  - otherwise: a random eligible room on `floor` (a Floor **id**, as sent by the
 *    Live Monitor). Eligible = has a resident, sensor not OFFLINE, no open incident.
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
        floor: { facilityId, ...(floor ? { id: floor } : {}) },
        residentId: { not: null },
        sensor: { status: { not: "OFFLINE" } },
        incidents: { none: { state: { in: [...OPEN_STATES] } } },
      },
      select: { id: true },
    });
    if (candidates.length === 0) {
      return jsonError(
        409,
        "No eligible room to simulate. A room needs a patient, a sensor that isn't offline, and no open alert."
      );
    }
    targetRoomId = candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  const room = await prisma.room.findFirst({
    where: { id: targetRoomId, floor: { facilityId } },
    select: { id: true, label: true, residentId: true },
  });

  if (!room || !room.residentId) return jsonError(404, "Room not found or has no resident.");

  const existingOpen = await prisma.incident.findFirst({
    where: { roomId: room.id, state: { in: [...OPEN_STATES] } },
    select: { id: true },
  });
  if (existingOpen) return jsonError(409, "Room already has an open incident.");

  try {
    const incident = await prisma.incident.create({
      data: { roomId: room.id, residentId: room.residentId, state: "ACTIVE", confidence: 98, detectedAt: new Date() },
    });

    await prisma.activityLogEntry.create({
      data: {
        facilityId,
        type: "INCIDENT_DETECTED",
        message: `Fall detected in Room ${room.label} (simulated)`,
        incidentId: incident.id,
        roomId: room.id,
      },
    });

    return NextResponse.json({ roomId: room.id, incidentId: incident.id }, { status: 201 });
  } catch (e) {
    // incidents_one_open_per_room: a real alert arrived at the same moment.
    if (isUniqueViolation(e)) return jsonError(409, "Room already has an open incident.");
    throw e;
  }
}
