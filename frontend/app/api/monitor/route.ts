import { prisma } from "@/lib/db/prisma";
import { projectRoom, ROOM_INCLUDE, type RoomRow } from "@/lib/live-monitor-server/projection";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";

/** GET /api/monitor?floor=2 — the room roster for a floor, projected to UI shape. */
export async function GET(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  let floor = searchParams.get("floor");

  if (!floor) {
    floor = await prisma.floor.findMany({
      where: {
        facilityId: auth.claims.facilityId,
      },
      take: 1,
      orderBy: {
        label: "asc"
      }
    }).then((val) => { return val[0].id })
  }

  const rows = (await prisma.room.findMany({
    where: {
      floor: {
        facilityId: auth.claims.facilityId,
        ...(floor ? { id: floor } : {})
      },
    },
    include: ROOM_INCLUDE as any,
    orderBy: { label: "asc" },
  }));

  return NextResponse.json(rows.map(projectRoom));
}
