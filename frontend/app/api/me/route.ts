import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/live-monitor-server/require-session";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;
    const { userId } = auth.claims;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, },
    });

    return NextResponse.json(user);
}