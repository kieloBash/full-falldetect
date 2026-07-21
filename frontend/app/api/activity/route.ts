import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import type { ActivityItem } from "@/lib/live-monitor/types";
import { ACTIVITY_DOT_CLASS } from "@/lib/live-monitor-server/activity";
import { formatClockTime } from "@/lib/live-monitor/utils";

/**
 * GET /api/activity?limit= — the facility-wide recent-activity feed, projected
 * to the UI's ActivityItem shape. The DB stores a typed `ActivityType` +
 * message; the UI wants a text line, a clock time, and a dot color, so we map
 * type → dot class here and format the timestamp.
 */
export async function GET(req: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { facilityId } = auth.claims;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 12, 50);

  const rows = await prisma.activityLogEntry.findMany({
    where: { facilityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, message: true, createdAt: true },
  });

  const items: ActivityItem[] = rows.map((r: { id: string; type: string; message: string; createdAt: Date }) => ({
    id: r.id,
    text: r.message,
    when: formatClockTime(new Date(r.createdAt)),
    color: ACTIVITY_DOT_CLASS[r.type] ?? "bg-slate-400",
  }));

  return NextResponse.json(items);
}
