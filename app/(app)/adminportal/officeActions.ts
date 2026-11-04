"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

function cleanName(formData: FormData, key = "name") {
  const name = String(formData.get(key) ?? "").trim();
  if (!name) throw new Error("Name is required.");
  return name;
}

function isUniqueViolation(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

// ── PENRO Offices ────────────────────────────────

export async function createPenroOffice(formData: FormData) {
  await requireSuperAdmin();
  const name = cleanName(formData);
  const existing = await prisma.penroOffice.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`PENRO office "${name}" already exists.`);
  }
  try {
    await prisma.penroOffice.create({ data: { name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error(`PENRO office "${name}" already exists.`);
    }
    throw err;
  }
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

export async function deletePenroOffice(formData: FormData) {
  await requireSuperAdmin();
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!id) throw new Error("Invalid id.");
  await prisma.penroOffice.delete({ where: { id } });
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

// ── PENRO Officers ───────────────────────────────

export async function createPenroOfficer(formData: FormData) {
  await requireSuperAdmin();
  const name = cleanName(formData);
  const existing = await prisma.penroOfficer.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`PENRO officer "${name}" already exists.`);
  }
  try {
    await prisma.penroOfficer.create({ data: { name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error(`PENRO officer "${name}" already exists.`);
    }
    throw err;
  }
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

export async function deletePenroOfficer(formData: FormData) {
  await requireSuperAdmin();
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!id) throw new Error("Invalid id.");
  await prisma.penroOfficer.delete({ where: { id } });
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

// ── CENRO Offices ────────────────────────────────

export async function createCenroOffice(formData: FormData) {
  await requireSuperAdmin();
  const name = cleanName(formData);
  const existing = await prisma.cenroOffice.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`CENRO office "${name}" already exists.`);
  }
  try {
    await prisma.cenroOffice.create({ data: { name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error(`CENRO office "${name}" already exists.`);
    }
    throw err;
  }
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

export async function deleteCenroOffice(formData: FormData) {
  await requireSuperAdmin();
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!id) throw new Error("Invalid id.");
  // Block delete if users or records still reference it
  const [users, records] = await Promise.all([
    prisma.user.count({ where: { cenroOfficeId: id } }),
    prisma.apprehensionRecord.count({ where: { cenroOfficeId: id } }),
  ]);
  if (users > 0 || records > 0) {
    throw new Error(
      `Cannot delete: ${users} user(s) and ${records} record(s) still use this office.`,
    );
  }
  await prisma.cenroOffice.delete({ where: { id } });
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

// ── CENRO Officers ───────────────────────────────

export async function createCenroOfficer(formData: FormData) {
  await requireSuperAdmin();
  const name = cleanName(formData);
  const existing = await prisma.cenroOfficer.findUnique({ where: { name } });
  if (existing) {
    throw new Error(`CENRO officer "${name}" already exists.`);
  }
  try {
    await prisma.cenroOfficer.create({ data: { name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error(`CENRO officer "${name}" already exists.`);
    }
    throw err;
  }
  revalidatePath("/adminportal");
  revalidatePath("/new");
}

export async function deleteCenroOfficer(formData: FormData) {
  await requireSuperAdmin();
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!id) throw new Error("Invalid id.");
  await prisma.cenroOfficer.delete({ where: { id } });
  revalidatePath("/adminportal");
  revalidatePath("/new");
}
