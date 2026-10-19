"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClientInfo } from "@/lib/get-ip";

export type LoginState = {
  error: string;
  /** Epoch ms when the rate-limit window ends; form should countdown + disable. */
  lockedUntil?: number;
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function getLockedUntil(ip: string, email: string): Promise<number | null> {
  const since = new Date(Date.now() - WINDOW_MS);
  const fails = await prisma.loginAttempt.findMany({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ ip }, { email }],
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (fails.length < MAX_ATTEMPTS) return null;

  // Lock lifts when enough oldest fails age out of the 15‑min window
  const unlockAt =
    fails[fails.length - MAX_ATTEMPTS].createdAt.getTime() + WINDOW_MS;
  return unlockAt > Date.now() ? unlockAt : null;
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Username and password are required." };
  }

  const { ip, country, region, city } = await getClientInfo();

  // ── Rate limit: already locked? ──
  const lockedUntil = await getLockedUntil(ip, email);
  if (lockedUntil) {
    const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000));
    return {
      error: `Too many login attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      lockedUntil,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Deactivated: never create a session; clear any leftover cookie
  if (user && !user.isActive) {
    const { clearSession } = await import("@/lib/auth");
    await clearSession();
    await prisma.loginAttempt.create({
      data: {
        ip,
        email,
        success: false,
        country,
        region,
        city,
        userId: user.id,
      },
    });
    return {
      error: "This account has been deactivated. Contact an administrator.",
    };
  }

  const passwordMatches =
    !!user && (await bcrypt.compare(password, user.passwordHash));

  // Always record the attempt, with approximate location
  await prisma.loginAttempt.create({
    data: {
      ip,
      email,
      success: passwordMatches,
      country,
      region,
      city,
      userId: user?.id ?? null,
    },
  });

  if (!passwordMatches) {
    // After this fail, may now be locked
    const nowLocked = await getLockedUntil(ip, email);
    if (nowLocked) {
      const mins = Math.max(1, Math.ceil((nowLocked - Date.now()) / 60_000));
      return {
        error: `Too many login attempts. Account locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        lockedUntil: nowLocked,
      };
    }
    return { error: "Invalid username or password." };
  }

  await createSession(user!.id, user!.role);
  redirect("/dashboard");
}
