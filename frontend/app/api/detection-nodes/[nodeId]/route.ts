// location: frontend/app/api/detection-nodes/[nodeId]/route.ts
// DELETE: remove a node record (e.g. an old laptop). Its sensors are kept and just
// detached (onDelete: SetNull). A running laptop re-registers on its next heartbeat.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;
  const { nodeId } = await params;

  const node = await prisma.detectionNode.findFirst({
    where: { id: nodeId, facilityId: user.facilityId },
    select: { id: true },
  });
  if (!node) return jsonError(404, "Detection node not found");

  await prisma.detectionNode.delete({ where: { id: node.id } });
  return NextResponse.json({ ok: true });
}
