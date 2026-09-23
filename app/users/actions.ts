"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRATOR") {
    throw new Error("Only administrators can create accounts.");
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as "ADMINISTRATOR" | "ENCODER";

  if (!email || !password || !fullName || !role) {
    throw new Error("All fields are required.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email, passwordHash, fullName, role },
  });

  revalidatePath("/users");
}
