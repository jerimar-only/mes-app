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