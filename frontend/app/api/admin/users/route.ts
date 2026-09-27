// location: frontend/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { hashPassword } from "@/lib/auth/password";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";
import { projectUser, USER_SELECT } from "@/lib/users-server/projection";
import { parseCreateUser } from "@/lib/users-server/validators";

/** GET /api/admin/users — every staff account in the caller's facility (admins first, then by name). */
export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  const rows = await prisma.user.findMany({
    where: { facilityId: auth.claims.facilityId },
    select: USER_SELECT,
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json(rows.map(projectUser));
}

/**
 * POST /api/admin/users { firstName, lastName, email, role, password } — create a staff
 * account in the admin's own facility. This replaces self-registration.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError(400, "Body must be JSON.");
  const parsed = parseCreateUser(body);
  if (!parsed.ok) return jsonError(400, parsed.error);
  const { firstName, lastName, email, role, password } = parsed.value;

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return jsonError(409, "An account with that email already exists.");

  try {
    const user = await prisma.user.create({
      data: {
        facilityId: auth.claims.facilityId,
        firstName,
        lastName,
        email,
        role,
        passwordHash: await hashPassword(password),
      },
      select: USER_SELECT,
    });
    return NextResponse.json(projectUser(user), { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "An account with that email already exists.");
    throw e;
  }
}
