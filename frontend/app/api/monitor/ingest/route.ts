import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const INGEST_SECRET = process.env.MONITOR_INGEST_SECRET;
const CONFIDENCE_THRESHOLD = 75;

function verifyIngestAuth(req: Request): boolean {
    const header = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${INGEST_SECRET}`;
    if (!INGEST_SECRET || header.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function POST(req: Request) {
    if (!verifyIngestAuth(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const { deviceId, confidence, detectedAt, eventType } = body as {
        deviceId?: string;
        confidence?: number;
        detectedAt?: string;
        eventType?: string;
    };

    if (!deviceId || typeof confidence !== "number" || !detectedAt || eventType !== "fall") {
        return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    const sensor = await prisma.sensor.findUnique({
        where: { deviceId },
        select: {
            room: {
                select: { id: true, label: true, residentId: true, floor: { select: { facilityId: true } } },
            },
        },
    });

    if (!sensor?.room) {
        return NextResponse.json({ error: `Unknown device ${deviceId}` }, { status: 404 });
    }

    const room = sensor.room;

    if (!room.residentId) {
        return NextResponse.json({ error: "Room has no resident." }, { status: 404 });
    }

    const facilityId = room.floor.facilityId;

    if (confidence < CONFIDENCE_THRESHOLD) {
        await prisma.activityLogEntry.create({
            data: {
                facilityId,
                type: "SENSOR_DEGRADED", // no LOW_CONFIDENCE_DETECTION in your ActivityType enum — see note below
                message: `Low-confidence detection in Room ${room.label} (${confidence}%)`,
                roomId: room.id,
            },
        });
        return NextResponse.json({ status: "logged_below_threshold" });
    }

    const existingOpen = await prisma.incident.findFirst({
        where: { roomId: room.id, state: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
    });
    if (existingOpen) {
        return NextResponse.json({ status: "already_open", incidentId: existingOpen.id });
    }

    const incident = await prisma.incident.create({
        data: {
            roomId: room.id,
            residentId: room.residentId,
            state: "ACTIVE",
            confidence,
            detectedAt: new Date(detectedAt),
        },
    });

    await prisma.activityLogEntry.create({
        data: {
            facilityId,
            type: "INCIDENT_DETECTED",
            message: `Fall detected in Room ${room.label}`,
            incidentId: incident.id,
            roomId: room.id,
        },
    });

    return NextResponse.json({ roomId: room.id, incidentId: incident.id }, { status: 201 });
}