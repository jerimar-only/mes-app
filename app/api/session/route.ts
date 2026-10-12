import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    await clearSession();
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Reject sessions for missing or deactivated accounts (stops login ↔ app loops)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true },
  });
  if (!user || !user.isActive) {
    await clearSession();
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}