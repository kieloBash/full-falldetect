// location: frontend/app/api/admin/floors/[floorId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { projectFloor } from "@/lib/admin/server-projection";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";

type Params = { params: Promise<{ floorId: string }> };

/** PATCH /api/admin/floors/{floorId} { name } — rename a floor. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { floorId } = await params;
  const { name } = await req.json().catch(() => ({}));

  if (!name || typeof name !== "string" || !name.trim()) return jsonError(400, "Floor name is required.");

  const existing = await prisma.floor.findFirst({ where: { id: floorId, facilityId }, select: { id: true } });
  if (!existing) return jsonError(404, "Floor not found.");

  try {
    const floor = await prisma.floor.update({
      where: { id: floorId },
      data: { label: name.trim() },
      select: { id: true, label: true },
    });
    const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true } });
    return NextResponse.json(projectFloor(floor, facility?.name ?? "Facility"));
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "A floor with that name already exists.");
    throw e;
  }
}

/**
 * DELETE /api/admin/floors/{floorId} — only empty floors can be deleted
 * (Room.floor is onDelete: Restrict). Move or delete the rooms first.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { floorId } = await params;

  const existing = await prisma.floor.findFirst({
    where: { id: floorId, facilityId },
    select: { id: true, label: true, _count: { select: { rooms: true } } },
  });
  if (!existing) return jsonError(404, "Floor not found.");
  if (existing._count.rooms > 0) {
    const n = existing._count.rooms;
    return jsonError(
      409,
      `Floor ${existing.label} still has ${n} room${n === 1 ? "" : "s"}. Move or delete them in Room Management first.`
    );
  }

  await prisma.floor.delete({ where: { id: floorId } });
  return NextResponse.json({ ok: true });
}
