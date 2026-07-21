import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { projectRoom, ROOM_INCLUDE, type RoomRow } from "@/lib/live-monitor-server/projection";

/** GET /api/monitor?floor=2 — the room roster for a floor, projected to UI shape. */
export async function GET(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const floor = searchParams.get("floor");

  const rows = (await prisma.room.findMany({
    where: {
      floor: { facilityId: auth.claims.facilityId, ...(floor ? { label: floor } : {}) },
    },
    include: ROOM_INCLUDE as any,
    orderBy: { label: "asc" },
  })) as unknown as RoomRow[];

  return NextResponse.json(rows.map(projectRoom));
}
