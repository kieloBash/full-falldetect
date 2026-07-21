import { projectPatient, splitName, type PatientRow } from "@/lib/admin/server-projection";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";

/** GET /api/admin/patients — residents in the caller's facility, as patients. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const rows = (await prisma.resident.findMany({
    where: { facilityId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      notes: true,
      discharged: true,
      room: { select: { id: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })) as PatientRow[];

  return NextResponse.json(rows.map(projectPatient));
}

/**
 * POST /api/admin/patients { name, roomId, notes } — create a resident and,
 * if a roomId is given, assign them to that room. Assignment writes the
 * INVERSE side (Room.residentId) and rejects if the room is already occupied.
 */
export async function POST(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { name, roomId, notes } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Patient name is required." }, { status: 400 });
  }

  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, floor: { facilityId } },
      select: { id: true, residentId: true },
    });
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    if (room.residentId) return NextResponse.json({ error: "That room is already occupied." }, { status: 409 });
  }

  const { firstName, lastName } = splitName(name);

  const patient = await prisma.$transaction(async (tx: any) => {
    const resident = await tx.resident.create({
      data: { facilityId, firstName, lastName, notes: (notes ?? "").trim() },
      select: { id: true, firstName: true, lastName: true, notes: true, discharged: true },
    });
    if (roomId) {
      await tx.room.update({ where: { id: roomId }, data: { residentId: resident.id } });
    }
    return resident;
  });

  return NextResponse.json(
    projectPatient({ ...patient, room: roomId ? { id: roomId } : null } as PatientRow),
    { status: 201 }
  );
}
