import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { projectFloor, FLOOR_INCLUDE, type FloorRow } from "@/lib/admin/server-projection";

/** GET /api/admin/floors — floors + rooms for the caller's facility. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true } });
  const wing = facility?.name ?? "Facility";

  const rows = (await prisma.floor.findMany({
    where: { facilityId },
    include: FLOOR_INCLUDE,
    orderBy: { label: "asc" },
  })) as FloorRow[];

  return NextResponse.json(rows.map((r) => projectFloor(r, wing)));
}

/** POST /api/admin/floors { name } — create a floor. `wing` is ignored (not stored). */
export async function POST(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Floor name is required." }, { status: 400 });
  }

  const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true } });
  const wing = facility?.name ?? "Facility";

  try {
    const floor = await prisma.floor.create({
      data: { facilityId, label: name.trim() },
      include: FLOOR_INCLUDE,
    });
    return NextResponse.json(projectFloor(floor as FloorRow, wing), { status: 201 });
  } catch (e) {
    // @@unique([facilityId, label]) — duplicate floor label
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "A floor with that name already exists." }, { status: 409 });
    }
    throw e;
  }
}
