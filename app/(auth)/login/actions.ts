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

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type LockScope = { ip?: string; email?: string };

/**
 * Lock if either this IP or this account has 5+ failed attempts in the last 15 minutes.
 * - Same computer (IP): locked even if username changes
 * - Same account (email): locked even from another device
 */
export async function getLockedUntil(
  scope: LockScope,
): Promise<number | null> {
  const ip = scope.ip?.trim() || undefined;
  const email = scope.email?.trim().toLowerCase() || undefined;
  if (!ip && !email) return null;

  const since = new Date(Date.now() - LOGIN_LOCK_WINDOW_MS);
  const or: { ip?: string; email?: string }[] = [];
  if (ip && ip !== "unknown") or.push({ ip });
  if (email) or.push({ email });
  if (or.length === 0) return null;

  const fails = await prisma.loginAttempt.findMany({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: or,
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (fails.length < MAX_LOGIN_ATTEMPTS) return null;

  const unlockAt =
    fails[fails.length - MAX_LOGIN_ATTEMPTS].createdAt.getTime() +
    LOGIN_LOCK_WINDOW_MS;
  return unlockAt > Date.now() ? unlockAt : null;
}

/** Page load: lock for this request's IP only. */
export async function getLockedUntilByIp(ip: string): Promise<number | null> {
  return getLockedUntil({ ip });
}

/** Check lock for current IP + optional username. */
export async function checkLoginLock(
  email?: string,
): Promise<{ lockedUntil: number | null }> {
  const { ip } = await getClientInfo();
  const lockedUntil = await getLockedUntil({
    ip,
    email: email?.trim().toLowerCase() || undefined,
  });
  return { lockedUntil };
}

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "Username and password are required." };
  }

  const { ip, country, region, city } = await getClientInfo();

  const lockedUntil = await getLockedUntil({ ip, email });
  if (lockedUntil) {
    const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000));
    return {
      error: `Too many login attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      lockedUntil,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

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
    const nowLocked = await getLockedUntil({ ip, email });
    if (nowLocked) {
      const mins = Math.max(1, Math.ceil((nowLocked - Date.now()) / 60_000));
      return {
        error: `Too many login attempts. Locked for ${mins} minute${mins === 1 ? "" : "s"}.`,
        lockedUntil: nowLocked,
      };
    }
    return { error: "Invalid username or password." };
  }

  await createSession(user!.id, user!.role);
  redirect("/dashboard");
}
