import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { toFalseAlarmReason } from "@/lib/live-monitor-server/projection";

/** POST /api/alerts/{roomId}/false-alarm — dismiss the open incident as a false alarm. */
export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { roomId } = await params;
  const { userId, facilityId } = auth.claims;
  const { reason } = await req.json();

  if (!reason || typeof reason !== "string") {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  const incident = await prisma.incident.findFirst({
    where: { roomId, state: { in: ["ACTIVE", "ACKNOWLEDGED"] }, room: { floor: { facilityId } } },
  });
  if (!incident) return NextResponse.json({ error: "No open alert for this room." }, { status: 404 });

  const mapped = toFalseAlarmReason(reason);
  const now = new Date();

  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      state: "FALSE_ALARM",
      resolvedAt: now,
      durationSeconds: Math.max(0, Math.floor((now.getTime() - incident.detectedAt.getTime()) / 1000)),
      responderId: incident.responderId ?? userId,
      falseAlarmReason: mapped as never,
      falseAlarmNote: mapped === "OTHER" ? reason : null,
    },
  });

  await prisma.activityLogEntry.create({
    data: { facilityId, type: "INCIDENT_FALSE_ALARM", message: `Room ${roomId} flagged false alarm — ${reason.toLowerCase()}`, incidentId: incident.id, roomId, actorId: userId },
  });

  return NextResponse.json({ ok: true });
}
