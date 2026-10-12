"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClientInfo } from "@/lib/get-ip";

type LoginState = { error: string };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
  const since = new Date(Date.now() - WINDOW_MS);

  // ── Rate limit: count recent failures by IP or email ──
  const recentFails = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ ip }, { email }],
    },
  });

  if (recentFails >= MAX_ATTEMPTS) {
    return {
      error: "Too many login attempts. Try again in 15 minutes.",
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
    return { error: "Invalid username or password." };
  }

  await createSession(user!.id, user!.role);
  redirect("/dashboard");
}