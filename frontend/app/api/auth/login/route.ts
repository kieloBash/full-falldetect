// location: frontend/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { AuthResult } from "@/lib/auth/api";

export async function POST(req: Request) {
  const { email, password, rememberMe } = await req.json().catch(() => ({}));

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
  }

  // Emails are stored lowercase by User Management.
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  // Same response whether the user is missing or the password is wrong —
  // never leak which emails have accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // Checked only after the password matches, so this message can't be used to probe emails.
  if (!user.isActive) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact your administrator." },
      { status: 403 }
    );
  }

  await createSession(
    { userId: user.id, email: user.email, facilityId: user.facilityId, role: user.role },
    Boolean(rememberMe)
  );

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const result: AuthResult = { userId: user.id, email: user.email, role: user.role };
  return NextResponse.json(result);
}
