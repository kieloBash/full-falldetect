// location: frontend/app/api/admin/users/[userId]/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { hashPassword } from "@/lib/auth/password";
import { jsonError } from "@/lib/api/errors";
import { validatePassword } from "@/lib/users-server/validators";

type Params = { params: Promise<{ userId: string }> };

/**
 * POST /api/admin/users/{userId}/reset-password { password } — an admin sets a new
 * temporary password (this replaces the unbuilt "Forgot password" email flow).
 * Unused PasswordResetToken rows for the user are cleared.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { userId } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const password = validatePassword(body?.password);
  if (!password.ok) return jsonError(400, password.error);

  const target = await prisma.user.findFirst({
    where: { id: userId, facilityId: auth.claims.facilityId },
    select: { id: true },
  });
  if (!target) return jsonError(404, "User not found.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password.value) } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
