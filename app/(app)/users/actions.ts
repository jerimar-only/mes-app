"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Only Super Admin can create accounts.");
  }

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const role = formData.get("role") as "SUPERADMIN" | "ADMINISTRATOR" | "ENCODER";

  if (!email || !password || !fullName || !role) {
    throw new Error("All fields are required.");
  }

  if (!["SUPERADMIN", "ADMINISTRATOR", "ENCODER"].includes(role)) {
    throw new Error("Invalid role.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Username already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email, passwordHash, fullName, role },
  });

  revalidatePath("/adminportal");
}

export async function toggleUserActive(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  if (!userId || userId === session.userId) {
    throw new Error("Cannot change your own status.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/adminportal");
}

export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  if (!userId || userId === session.userId) {
    throw new Error("Cannot delete your own account.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/adminportal");
}

export async function resetPassword(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  const newPassword = formData.get("newPassword") as string;

  if (!userId || !newPassword) {
    throw new Error("Missing fields.");
  }

  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath("/adminportal");
}

const ROLE_ORDER = ["ENCODER", "ADMINISTRATOR", "SUPERADMIN"] as const;
type AppRole = (typeof ROLE_ORDER)[number];

const ROLE_LABEL: Record<AppRole, string> = {
  ENCODER: "Encoder",
  ADMINISTRATOR: "Administrator",
  SUPERADMIN: "Super Admin",
};

/**
 * Promote or demote a user one step on the role ladder:
 * Encoder → Administrator → Super Admin
 */
export async function changeUserRole(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  const direction = formData.get("direction") as string; // "promote" | "demote"

  if (!userId) throw new Error("Missing user.");
  if (userId === session.userId) {
    throw new Error("Cannot change your own role.");
  }
  if (direction !== "promote" && direction !== "demote") {
    throw new Error("Invalid direction.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const current = user.role as AppRole;
  const idx = ROLE_ORDER.indexOf(current);
  if (idx < 0) throw new Error("Unknown role.");

  const nextIdx = direction === "promote" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= ROLE_ORDER.length) {
    throw new Error(
      direction === "promote"
        ? "Already at the highest role (Super Admin)."
        : "Already at the lowest role (Encoder).",
    );
  }

  const nextRole = ROLE_ORDER[nextIdx];

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  revalidatePath("/adminportal");

  return {
    from: ROLE_LABEL[current],
    to: ROLE_LABEL[nextRole],
  };
}

/**
 * Clears failed login attempts for a user so they can sign in again
 * without waiting out the 15-minute rate-limit window.
 * Login lockout counts recent failures by email (and IP); we delete
 * failed rows for this user's email and userId.
 */
export async function resetLoginAttempts(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  if (!userId) {
    throw new Error("Missing user.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error("User not found.");
  }

  const email = user.email.trim().toLowerCase();

  const result = await prisma.loginAttempt.deleteMany({
    where: {
      success: false,
      OR: [{ email }, { userId: user.id }],
    },
  });

  revalidatePath("/adminportal");

  return { deleted: result.count };
}