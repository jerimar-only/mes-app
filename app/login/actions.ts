"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

type LoginState = { error: string };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
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

  const ip = await getClientIp();
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
  const passwordMatches =
    !!user &&
    user.isActive &&
    (await bcrypt.compare(password, user.passwordHash));

  // Always record the attempt
  await prisma.loginAttempt.create({
    data: {
      ip,
      email,
      success: passwordMatches,
    },
  });

  if (!passwordMatches) {
    // Same message whether user is missing, inactive, or wrong password
    return { error: "Invalid username or password." };
  }

  await createSession(user!.id, user!.role);
  redirect("/dashboard");
}