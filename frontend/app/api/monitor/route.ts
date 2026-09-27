// location: frontend/app/api/monitor/route.ts
import { prisma } from "@/lib/db/prisma";
import { projectRoom, ROOM_INCLUDE } from "@/lib/live-monitor-server/projection";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";
import { withSignedScreenshots } from "@/lib/detection-node-server/supabase-storage";

/**
 * GET /api/monitor?floor=<floorId> — the room roster for a floor, projected to UI shape.
 * Empty `floor` = the facility's first floor. A facility with no floors yet (fresh
 * database) returns [] instead of a 500.
 */
export async function GET(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const { searchParams } = new URL(req.url);
  let floorId = searchParams.get("floor");

  if (!floorId) {
    const first = await prisma.floor.findFirst({
      where: { facilityId },
      orderBy: { label: "asc" },
      select: { id: true },
    });
    if (!first) return NextResponse.json([]);
    floorId = first.id;
  }

  const rows = await prisma.room.findMany({
    where: { floor: { facilityId, id: floorId } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include: ROOM_INCLUDE as any,
    orderBy: { label: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(await withSignedScreenshots(rows.map((r: any) => projectRoom(r))));
}
