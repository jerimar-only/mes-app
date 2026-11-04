"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

function parseId(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Assign (or clear) the default PENRO officer for a PENRO office */
export async function setPenroDefaultOfficer(formData: FormData) {
  await requireSuperAdmin();
  const penroOfficeId = parseId(formData, "penroOfficeId");
  if (!penroOfficeId) throw new Error("PENRO office is required.");
  const officerId = parseId(formData, "officerId"); // null = clear

  await prisma.penroOffice.update({
    where: { id: penroOfficeId },
    data: { defaultOfficerId: officerId },
  });

  revalidatePath("/adminportal");
  revalidatePath("/new");
}

/** Assign a CENRO office to a PENRO (AOR). Pass penroOfficeId empty to unassign. */
export async function setCenroParentPenro(formData: FormData) {
  await requireSuperAdmin();
  const cenroOfficeId = parseId(formData, "cenroOfficeId");
  if (!cenroOfficeId) throw new Error("CENRO office is required.");
  const penroOfficeId = parseId(formData, "penroOfficeId"); // null = unassign

  await prisma.cenroOffice.update({
    where: { id: cenroOfficeId },
    data: { penroOfficeId },
  });

  revalidatePath("/adminportal");
  revalidatePath("/new");
}

/** Assign (or clear) the default CENRO officer for a CENRO office */
export async function setCenroDefaultOfficer(formData: FormData) {
  await requireSuperAdmin();
  const cenroOfficeId = parseId(formData, "cenroOfficeId");
  if (!cenroOfficeId) throw new Error("CENRO office is required.");
  const officerId = parseId(formData, "officerId"); // null = clear

  await prisma.cenroOffice.update({
    where: { id: cenroOfficeId },
    data: { defaultOfficerId: officerId },
  });

  revalidatePath("/adminportal");
  revalidatePath("/new");
}
