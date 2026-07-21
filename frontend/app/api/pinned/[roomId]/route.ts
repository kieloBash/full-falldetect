import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";

/** DELETE /api/pinned/{roomId} — unpin a room for the current user. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { userId } = auth.claims;
  const { roomId } = await params;

  // deleteMany (not delete) so unpinning something already unpinned doesn't throw.
  await prisma.pinnedRoom.deleteMany({ where: { userId, roomId } });

  return NextResponse.json({ ok: true });
}
