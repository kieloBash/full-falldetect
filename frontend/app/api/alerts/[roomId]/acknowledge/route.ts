import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/** POST /api/alerts/{roomId}/acknowledge — move the open incident to ACKNOWLEDGED. */
export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { roomId } = await params;
  const { userId, facilityId } = auth.claims;

  const incident = await prisma.incident.findFirst({
    where: { roomId, state: "ACTIVE", room: { floor: { facilityId } } },
  });
  if (!incident) return NextResponse.json({ error: "No active alert for this room." }, { status: 404 });

  await prisma.incident.update({
    where: { id: incident.id },
    data: { state: "ACKNOWLEDGED", acknowledgedAt: new Date(), responderId: userId },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  const acknowledgedBy = user ? `${user.firstName} ${user.lastName}` : "Unknown";

  await prisma.activityLogEntry.create({
    data: { facilityId, type: "INCIDENT_ACKNOWLEDGED", message: `${acknowledgedBy} acknowledged Room ${roomId}`, incidentId: incident.id, roomId, actorId: userId },
  });

  return NextResponse.json({ acknowledgedBy });
}
