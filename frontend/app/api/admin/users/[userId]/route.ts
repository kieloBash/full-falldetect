// location: frontend/app/api/admin/users/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminSession } from "@/lib/live-monitor-server/require-session";
import { isUniqueViolation, jsonError } from "@/lib/api/errors";
import { projectUser, USER_SELECT } from "@/lib/users-server/projection";
import { parseUpdateUser } from "@/lib/users-server/validators";

type Params = { params: Promise<{ userId: string }> };

/**
 * PATCH /api/admin/users/{userId} { firstName?, lastName?, email?, role?, isActive? }
 *
 * Rules:
 *  - Only users in the admin's facility (404 otherwise).
 *  - An admin can't change their own role or deactivate themselves (prevents lock-out).
 *  - The facility must keep at least one active ADMIN.
 *  - There is no DELETE: accounts are deactivated so incident history keeps its responder.
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { facilityId, userId: actorId } = auth.claims;
  const { userId } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError(400, "Body must be JSON.");
  const parsed = parseUpdateUser(body);
  if (!parsed.ok) return jsonError(400, parsed.error);
  const changes = parsed.value;

  const target = await prisma.user.findFirst({
    where: { id: userId, facilityId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) return jsonError(404, "User not found.");

  const isSelf = userId === actorId;
  if (isSelf && changes.role !== undefined && changes.role !== target.role) {
    return jsonError(409, "You can't change your own account type.");
  }
  if (isSelf && changes.isActive === false) {
    return jsonError(409, "You can't deactivate your own account.");
  }

  const losesAdmin =
    target.role === "ADMIN" &&
    target.isActive &&
    ((changes.role !== undefined && changes.role !== "ADMIN") || changes.isActive === false);
  if (losesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { facilityId, role: "ADMIN", isActive: true, id: { not: userId } },
    });
    if (otherAdmins === 0) return jsonError(409, "The facility must keep at least one active administrator.");
  }

  if (changes.email) {
    const owner = await prisma.user.findUnique({ where: { email: changes.email }, select: { id: true } });
    if (owner && owner.id !== userId) return jsonError(409, "An account with that email already exists.");
  }

  try {
    const user = await prisma.user.update({ where: { id: userId }, data: changes, select: USER_SELECT });
    return NextResponse.json(projectUser(user));
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError(409, "An account with that email already exists.");
    throw e;
  }
}
