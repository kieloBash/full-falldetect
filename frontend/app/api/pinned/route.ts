import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/** GET /api/pinned — the current user's pinned room ids (scoped to their facility). */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { userId, facilityId } = auth.claims;

  const rows = await prisma.pinnedRoom.findMany({
    where: { userId, room: { floor: { facilityId } } },
    select: { roomId: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rows.map((r: { roomId: string }) => r.roomId));
}

/** POST /api/pinned { roomId } — pin a room for the current user (idempotent). */
export async function POST(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { userId, facilityId } = auth.claims;
  const { roomId } = await req.json();

  if (!roomId || typeof roomId !== "string") {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  // Confirm the room is in the caller's facility before pinning.
  const room = await prisma.room.findFirst({ where: { id: roomId, floor: { facilityId } }, select: { id: true } });
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  // upsert against the @@unique([userId, roomId]) constraint — pinning twice is a no-op.
  await prisma.pinnedRoom.upsert({
    where: { userId_roomId: { userId, roomId } },
    create: { userId, roomId },
    update: {},
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
