import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { AuthResult } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { email, password, rememberMe } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Same response whether the user is missing or the password is wrong —
  // never leak which emails have accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await createSession(
    { userId: user.id, email: user.email, facilityId: user.facilityId, role: user.role },
    Boolean(rememberMe)
  );

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const result: AuthResult = { userId: user.id, email: user.email, role: user.role };
  return NextResponse.json(result);
}
