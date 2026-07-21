import { projectPatient, splitName, type PatientRow } from "@/lib/admin/server-projection";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";

async function scopedResident(patientId: string, facilityId: string) {
  return prisma.resident.findFirst({
    where: { id: patientId, facilityId },
    select: { id: true, room: { select: { id: true } } },
  });
}

/**
 * PATCH /api/admin/patients/{patientId} { name, roomId, notes, discharged } —
 * update the resident and reconcile room assignment. Room assignment lives on
 * Room.residentId (schema 1:1), so changing `roomId` means detaching the old
 * room and attaching the new one — rejecting if the target is occupied by
 * someone else. Discharge does NOT auto-vacate the room (assignment intact).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { patientId } = await params;
  const { name, roomId, notes, discharged } = await req.json();

  const existing = await scopedResident(patientId, facilityId);
  if (!existing) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

  const currentRoomId = existing.room?.id ?? "";
  const nextRoomId: string = roomId ?? "";
  const roomChanged = nextRoomId !== currentRoomId;

  if (roomChanged && nextRoomId) {
    const room = await prisma.room.findFirst({
      where: { id: nextRoomId, floor: { facilityId } },
      select: { id: true, residentId: true },
    });
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    if (room.residentId && room.residentId !== patientId) {
      return NextResponse.json({ error: "That room is already occupied." }, { status: 409 });
    }
  }

  const { firstName, lastName } = splitName(name ?? "");

  const patient = await prisma.$transaction(async (tx: any) => {
    const resident = await tx.resident.update({
      where: { id: patientId },
      data: {
        ...(name ? { firstName, lastName } : {}),
        ...(notes !== undefined ? { notes: (notes ?? "").trim() } : {}),
        ...(discharged !== undefined ? { discharged: Boolean(discharged) } : {}),
      },
      select: { id: true, firstName: true, lastName: true, notes: true, discharged: true },
    });

    if (roomChanged) {
      if (currentRoomId) {
        await tx.room.update({ where: { id: currentRoomId }, data: { residentId: null } });
      }
      if (nextRoomId) {
        await tx.room.update({ where: { id: nextRoomId }, data: { residentId: patientId } });
      }
    }
    return resident;
  });

  return NextResponse.json(
    projectPatient({ ...patient, room: nextRoomId ? { id: nextRoomId } : null } as PatientRow)
  );
}

/**
 * DELETE /api/admin/patients/{patientId} — remove the resident. Their room
 * (if any) is freed first (Room.residentId → null) so it doesn't dangle;
 * Resident has onDelete: Restrict from Room's side, so we detach before delete.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { patientId } = await params;

  const existing = await scopedResident(patientId, facilityId);
  if (!existing) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

  await prisma.$transaction(async (tx: any) => {
    if (existing.room?.id) {
      await tx.room.update({ where: { id: existing.room.id }, data: { residentId: null } });
    }
    await tx.resident.delete({ where: { id: patientId } });
  });

  return NextResponse.json({ ok: true });
}
