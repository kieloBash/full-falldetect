// location: frontend/app/api/monitor/ingest/route.ts
// REPLACES the existing ingest route (TDS §6.3).
// Changes:
//  - screenshotPath: the Supabase Storage object path uploaded by the camera laptop
//    (validated to belong to this camera). The old "screenshot" local path still works.
//  - 401 has no debug field (TDS §9.4).
//  - Concurrent duplicate alerts are handled via the one-open-incident-per-room index.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";
import { isMachineAuthorized } from "@/lib/detection-node-server/machine-auth";
import { parseIngestFields } from "@/lib/detection-node-server/validators";
import { isValidScreenshotPath } from "@/lib/detection-node-server/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_STATES = ["ACTIVE", "ACKNOWLEDGED"] as const;

async function findOpenIncident(roomId: string) {
  return prisma.incident.findFirst({
    where: { roomId, state: { in: [...OPEN_STATES] } },
    select: { id: true },
  });
}

export async function POST(req: Request) {
  if (!isMachineAuthorized(req)) return jsonError(401, "Unauthorized");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Body must be JSON");
  }
  const parsed = parseIngestFields({
    deviceId: body.deviceId,
    confidence: body.confidence,
    detectedAt: body.detectedAt,
    eventType: body.eventType,
    screenshotPath: body.screenshotPath,
    screenshot: body.screenshot,
  });
  if (!parsed.ok) return jsonError(400, parsed.error);
  const { deviceId, confidence, detectedAt, screenshotPath } = parsed.value;

  const isLegacyLocal = screenshotPath?.startsWith("screenshots/") ?? false;
  if (screenshotPath && !isLegacyLocal && !isValidScreenshotPath(screenshotPath, deviceId)) {
    return jsonError(400, `screenshotPath must look like ${deviceId}/<name>.jpg`);
  }

  const sensor = await prisma.sensor.findUnique({
    where: { deviceId },
    include: {
      room: {
        include: {
          resident: { select: { id: true, firstName: true, lastName: true } },
          floor: { select: { facilityId: true } },
        },
      },
    },
  });
  if (!sensor?.room) return jsonError(404, `Unknown device ${deviceId}`);
  const room = sensor.room;
  if (!room.resident) return jsonError(404, `Room ${room.label} has no resident assigned`);

  const open = await findOpenIncident(room.id);
  if (open) return NextResponse.json({ status: "already_open", incidentId: open.id });

  const resident = room.resident;
  const rounded = Math.round(confidence);

  try {
    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          roomId: room.id,
          residentId: resident.id,
          state: "ACTIVE",
          confidence: rounded, // rounded in case the column is an Int (TDS §5.1: 0–100)
          detectedAt,
          screenshotPath,
        },
      });
      await tx.activityLogEntry.create({
        data: {
          facilityId: room.floor.facilityId,
          type: "INCIDENT_DETECTED",
          incidentId: created.id,
          roomId: room.id,
          message: `Possible fall in Room ${room.label}: ${resident.firstName} ${resident.lastName} (${rounded}% confidence)`,
        },
      });
      await tx.sensor.update({ where: { id: sensor.id }, data: { lastSeenAt: new Date() } });
      return created;
    });
    return NextResponse.json({ roomId: room.id, incidentId: incident.id }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Two alerts raced; the partial unique index let only one through.
      const winner = await findOpenIncident(room.id);
      return NextResponse.json({ status: "already_open", incidentId: winner?.id ?? null });
    }
    throw err;
  }
}
