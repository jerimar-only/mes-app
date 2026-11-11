"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const ALLOWED_ROLES = [
  "SUPERADMIN",
  "ADMINISTRATOR",
  "PENRO_ADMIN",
  "CENRO_ADMIN",
  "ENCODER",
  "CENRO",
  "REGIONAL",
] as const;

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMINISTRATOR: "Administrator",
  PENRO_ADMIN: "PENRO Admin",
  CENRO_ADMIN: "CENRO Admin",
  ENCODER: "Encoder",
  CENRO: "CENRO",
  REGIONAL: "Regional",
};

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Only Super Admin can create accounts.");
  }

  const rawEmail = (formData.get("email") as string) ?? "";
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const role = formData.get("role") as string;
  const cenroOfficeRaw = (formData.get("cenroOfficeId") as string) || "";
  const penroOfficeRaw = (formData.get("penroOfficeId") as string) || "";
  const cenroOfficeId = cenroOfficeRaw
    ? parseInt(cenroOfficeRaw, 10)
    : null;
  const penroOfficeId = penroOfficeRaw
    ? parseInt(penroOfficeRaw, 10)
    : null;

  if (/\s/.test(rawEmail)) {
    throw new Error("Username cannot contain spaces.");
  }

  const email = rawEmail.trim().toLowerCase();

  if (!email || !password || !fullName || !role) {
    throw new Error("All fields are required.");
  }

  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    throw new Error("Invalid role.");
  }

  if (role === "CENRO" || role === "CENRO_ADMIN") {
    if (!cenroOfficeId || Number.isNaN(cenroOfficeId)) {
      throw new Error("CENRO / CENRO admin accounts must be assigned to a CENRO office.");
    }
  }

  if (role === "PENRO_ADMIN") {
    if (!penroOfficeId || Number.isNaN(penroOfficeId)) {
      throw new Error("PENRO admin accounts must be assigned to a PENRO office.");
    }
  }

  if (role === "PENRO_ADMIN" && penroOfficeId) {
    const penro = await prisma.penroOffice.findUnique({
      where: { id: penroOfficeId },
      select: { id: true },
    });
    if (!penro) {
      throw new Error(
        "Selected PENRO office does not exist. Add PENRO offices first in the Super Admin portal.",
      );
    }
  }

  if ((role === "CENRO" || role === "CENRO_ADMIN") && cenroOfficeId) {
    const cenro = await prisma.cenroOffice.findUnique({
      where: { id: cenroOfficeId },
      select: { id: true },
    });
    if (!cenro) throw new Error("Selected CENRO office does not exist.");
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
    data: {
      email,
      passwordHash,
      fullName,
      role: role as any,
      cenroOfficeId:
        role === "CENRO" || role === "CENRO_ADMIN" ? cenroOfficeId : null,
      penroOfficeId: role === "PENRO_ADMIN" ? penroOfficeId : null,
    },
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

/**
 * Set a user's role directly (works for every role, including PENRO_ADMIN,
 * CENRO_ADMIN, CENRO and REGIONAL). Office assignment is validated and the
 * irrelevant office column is cleared so scoping stays consistent.
 */
export async function setUserRole(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(formData.get("userId") as string, 10);
  const role = (formData.get("role") as string) ?? "";
  const penroRaw = (formData.get("penroOfficeId") as string) || "";
  const cenroRaw = (formData.get("cenroOfficeId") as string) || "";
  const penroOfficeId = penroRaw ? parseInt(penroRaw, 10) : null;
  const cenroOfficeId = cenroRaw ? parseInt(cenroRaw, 10) : null;

  if (!userId || Number.isNaN(userId)) throw new Error("Missing user.");
  if (userId === session.userId) {
    throw new Error("Cannot change your own role.");
  }
  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    throw new Error("Invalid role.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const needsPenro = role === "PENRO_ADMIN";
  const needsCenro = role === "CENRO" || role === "CENRO_ADMIN";

  if (needsPenro) {
    if (!penroOfficeId || Number.isNaN(penroOfficeId)) {
      throw new Error("PENRO admin accounts must be assigned to a PENRO office.");
    }
    const penro = await prisma.penroOffice.findUnique({
      where: { id: penroOfficeId },
      select: { id: true },
    });
    if (!penro) throw new Error("Selected PENRO office does not exist.");
  }

  if (needsCenro) {
    if (!cenroOfficeId || Number.isNaN(cenroOfficeId)) {
      throw new Error("CENRO / CENRO admin accounts must be assigned to a CENRO office.");
    }
    const cenro = await prisma.cenroOffice.findUnique({
      where: { id: cenroOfficeId },
      select: { id: true },
    });
    if (!cenro) throw new Error("Selected CENRO office does not exist.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: role as any,
      penroOfficeId: needsPenro ? penroOfficeId : null,
      cenroOfficeId: needsCenro ? cenroOfficeId : null,
    },
  });

  revalidatePath("/adminportal");

  return {
    from: ROLE_LABEL[user.role] ?? user.role,
    to: ROLE_LABEL[role] ?? role,
  };
}

/**
 * Clears failed login attempts for a user so they can sign in again
 * without waiting out the 15-minute rate-limit window.
 * Lock is IP-based: also clears failed attempts from IPs that tried this account.
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

  // IPs that recently failed with this username (so Clear lockout unlocks those devices)
  const related = await prisma.loginAttempt.findMany({
    where: {
      success: false,
      OR: [{ email }, { userId: user.id }],
    },
    select: { ip: true },
    distinct: ["ip"],
  });
  const ips = related.map((r) => r.ip).filter(Boolean);

  const result = await prisma.loginAttempt.deleteMany({
    where: {
      success: false,
      OR: [
        { email },
        { userId: user.id },
        ...(ips.length ? [{ ip: { in: ips } }] : []),
      ],
    },
  });

  revalidatePath("/adminportal");

  return { deleted: result.count };
}