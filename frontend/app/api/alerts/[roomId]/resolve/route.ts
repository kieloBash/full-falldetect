import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/** POST /api/alerts/{roomId}/resolve — mark the open incident RESOLVED. */
export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { roomId } = await params;
  const { userId, facilityId } = auth.claims;

  const incident = await prisma.incident.findFirst({
    where: { roomId, state: { in: ["ACTIVE", "ACKNOWLEDGED"] }, room: { floor: { facilityId } } },
  });
  if (!incident) return NextResponse.json({ error: "No open alert for this room." }, { status: 404 });

  const now = new Date();
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - incident.detectedAt.getTime()) / 1000));

  await prisma.incident.update({
    where: { id: incident.id },
    data: { state: "RESOLVED", resolvedAt: now, durationSeconds, responderId: incident.responderId ?? userId },
  });

  await prisma.activityLogEntry.create({
    data: { facilityId, type: "INCIDENT_RESOLVED", message: `Room ${roomId} resolved`, incidentId: incident.id, roomId, actorId: userId },
  });

  return NextResponse.json({ ok: true });
}
