// location: frontend/app/api/admin/floors/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { projectFloor, type FloorRow } from "@/lib/admin/server-projection";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";

async function facilityWing(facilityId: string): Promise<string> {
  const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true } });
  return facility?.name ?? "Facility";
}

/** GET /api/admin/floors — floors for the caller's facility. */
export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const [wing, rows] = await Promise.all([
    facilityWing(facilityId),
    prisma.floor.findMany({
      where: { facilityId },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }) as Promise<FloorRow[]>,
  ]);

  return NextResponse.json(rows.map((r) => projectFloor(r, wing)));
}

/** POST /api/admin/floors { name } — create a floor. `wing` is not stored. */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { name } = await req.json().catch(() => ({}));

  if (!name || typeof name !== "string" || !name.trim()) return jsonError(400, "Floor name is required.");

  try {
    const floor = await prisma.floor.create({
      data: { facilityId, label: name.trim() },
      select: { id: true, label: true },
    });
    return NextResponse.json(projectFloor(floor, await facilityWing(facilityId)), { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "A floor with that name already exists.");
    throw e;
  }
}
