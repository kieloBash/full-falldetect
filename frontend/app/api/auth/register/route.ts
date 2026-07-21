import { Prisma } from "@/app/generated/prisma/client";
import type { AuthResult } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: Request) {
  const { firstName, lastName, email, facility, password, agreedToTerms } = await req.json();

  if (!firstName || !lastName || !email || !facility || !password) {
    return NextResponse.json({ error: "Fill in every field to create your account." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!agreedToTerms) {
    return NextResponse.json({ error: "Please accept the terms to continue." }, { status: 400 });
  }

  // `facility` is a Facility.id (cuid) from GET /api/facilities.
  const facilityRow = await prisma.facility.findUnique({ where: { id: facility } });
  if (!facilityRow) {
    return NextResponse.json({ error: "Unknown facility." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: { firstName, lastName, email, facilityId: facility, passwordHash },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    throw e;
  }

  await createSession(
    { userId: user.id, email: user.email, facilityId: user.facilityId, role: user.role },
    true
  );

  const result: AuthResult = { userId: user.id, email: user.email, role: user.role };
  return NextResponse.json(result, { status: 201 });
}
