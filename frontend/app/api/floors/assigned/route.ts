import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;
    const { userId, facilityId } = auth.claims;

    const floors = await prisma.floor.findMany({
        where: { facilityId },
        orderBy: { label: "asc" },
        select: { id: true, label: true },
    });

    return NextResponse.json(floors);
}