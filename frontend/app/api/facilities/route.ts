import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { FacilityOption } from "@/lib/auth/types";

export async function GET() {
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const options: FacilityOption[] = facilities.map((f: { id: string; name: string }) => ({
    value: f.id,
    label: f.name,
  }));
  return NextResponse.json(options);
}
