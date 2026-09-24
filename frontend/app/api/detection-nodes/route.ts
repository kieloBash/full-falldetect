// location: frontend/app/api/detection-nodes/route.ts
// GET: detection nodes (camera laptops) in the admin's facility, newest heartbeat first.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { nodeInclude, projectNode } from "@/lib/detection-node-server/projection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;

  const nodes = await prisma.detectionNode.findMany({
    where: { facilityId: user.facilityId },
    orderBy: [{ lastHeartbeatAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    include: nodeInclude,
  });

  const now = Date.now();
  return NextResponse.json(nodes.map((n) => projectNode(n, now)), {
    headers: { "Cache-Control": "no-store" },
  });
}
