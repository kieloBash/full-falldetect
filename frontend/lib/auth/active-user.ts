// location: frontend/lib/auth/active-user.ts
// The JWT stays valid until it expires (8 h / 30 days), so a deactivated user could keep
// using an old cookie. Route guards call this to reject them immediately. One indexed
// lookup by primary key per request.
import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function isUserActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  return user?.isActive === true;
}
