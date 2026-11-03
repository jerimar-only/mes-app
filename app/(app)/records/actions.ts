"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { getOfficeScope } from "@/lib/officeScope";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function updateRecordStatus(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to edit saved records.");
  }

  const id = parseInt(formData.get("id") as string, 10);
  const status = formData.get("status") as any;
  const docketNumber = (formData.get("docketNumber") as string) || null;
  const orderOfFinalityDate = (formData.get("orderOfFinalityDate") as string) || null;

  await prisma.apprehensionRecord.update({
    where: { id },
    data: { status, docketNumber, orderOfFinalityDate },
  });

  revalidatePath(`/records/${id}`);
  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function createRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.createRecord(session.role as Role)) {
    throw new Error("You don't have permission to create records.");
  }

  const scope = await getOfficeScope();
  let cenroOfficeId = parseInt(formData.get("cenroOfficeId") as string, 10);
  // CENRO accounts may only create records for their own office
  if (scope?.isCenro && scope.officeId) {
    cenroOfficeId = scope.officeId;
  }
  const year = parseInt(formData.get("year") as string, 10);
  const month = formData.get("month") ? parseInt(formData.get("month") as string, 10) : null;
  const dateOfApprehension = (formData.get("dateOfApprehension") as string) || null;
  const placeOfApprehension = (formData.get("placeOfApprehension") as string) || null;
  const circumstances = (formData.get("circumstances") as string) || null;
  const apprehendingAgency = (formData.get("apprehendingAgency") as string) || null;
  const claimantRespondent = (formData.get("claimantRespondent") as string) || null;
  const custodianLocation = (formData.get("custodianLocation") as string) || null;
  const otherAgencies = (formData.get("otherAgencies") as string) || null;
  const remarks = (formData.get("remarks") as string) || null;
  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;
  const dateField = (k: string) => {
    const v = formData.get(k) as string;
    return v ? new Date(v) : null;
  };
  const itemQty = formData.getAll("itemQty") as string[];
  const itemSpecies = formData.getAll("itemSpecies") as string[];
  const itemForms = formData.getAll("itemForms") as string[];
  const itemVolumeBdFt = formData.getAll("itemVolumeBdFt") as string[];
  const itemVolumeCuM = formData.getAll("itemVolumeCuM") as string[];
  const itemValue = formData.getAll("itemValue") as string[];

  const items = itemSpecies
    .map((species, i) => ({
      quantity: itemQty[i] || null,
      species: species || null,
      forms: itemForms[i] || null,
      volumeBdFt: itemVolumeBdFt[i] ? parseFloat(itemVolumeBdFt[i]) : null,
      volumeCuM: itemVolumeCuM[i] ? parseFloat(itemVolumeCuM[i]) : null,
      estimatedValue: itemValue[i] ? parseFloat(itemValue[i]) : null,
    }))
    .filter((item) => item.species || item.forms || item.volumeBdFt || item.volumeCuM || item.estimatedValue);

  const convType = formData.getAll("convType") as string[];
  const convQty = formData.getAll("convQty") as string[];
  const convValue = formData.getAll("convValue") as string[];
  const conveyances = convType
    .map((type, i) => ({
      type: type || null,
      quantity: parseInt(convQty[i] || "1", 10) || 1,
      estimatedValue: convValue[i] ? parseFloat(convValue[i]) : null,
    }))
    .filter((c) => c.type);

  const equipType = formData.getAll("equipType") as string[];
  const equipQty = formData.getAll("equipQty") as string[];
  const equipValue = formData.getAll("equipValue") as string[];
  const equipment = equipType
    .map((type, i) => ({
      type: type || null,
      quantity: parseInt(equipQty[i] || "1", 10) || 1,
      estimatedValue: equipValue[i] ? parseFloat(equipValue[i]) : null,
    }))
    .filter((e) => e.type);

  const record = await prisma.apprehensionRecord.create({
    data: {
      cenroOfficeId,
      year,
      month,
      dateOfApprehension,
      placeOfApprehension,
      circumstances,
      apprehendingAgency,
      claimantRespondent,
      custodianLocation,
      otherAgencies,
      remarks,
      sourcePlace: str("sourcePlace"),
      gpsCoordinates: str("gpsCoordinates"),
      landClassification: str("landClassification"),
      otherRemarks: str("otherRemarks"),
      caseStatus: str("caseStatus"),
      acpEndorsedToPenro: dateField("acpEndorsedToPenro"),
      acpEndorsedToRo: dateField("acpEndorsedToRo"),
      status: "UNKNOWN",
      items: items.length ? { create: items } : undefined,
      conveyances: conveyances.length ? { create: conveyances } : undefined,
      equipment: equipment.length ? { create: equipment } : undefined,
    },
  });

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/records/${record.id}`);
}

/** Load the signed-in user from DB (authoritative role, not only JWT). */
async function requireActiveUser() {
  const session = await getSession();
  if (!session) return null;
  const userId = Number(session.userId);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return user;
}

export async function deleteRecord(formData: FormData) {
  const user = await requireActiveUser();
  if (!user || !permissions.softDeleteRecord(user.role as Role)) {
    throw new Error("You don't have permission to delete records.");
  }

  const id = parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid record.");
  }

  const existing = await prisma.apprehensionRecord.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  });
  if (!existing) throw new Error("Record not found.");
  if (existing.isDeleted) throw new Error("Record is already deleted.");

  await prisma.apprehensionRecord.update({
    where: { id },
    data: { isDeleted: true },
  });

  revalidatePath(`/records/${id}`);
  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/records?deleted=only`);
}

// ─── Edit record (shared save logic) ───────────────────────────

async function saveRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to edit saved records.");
  }

  const id = parseInt(formData.get("id") as string, 10);
  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;
  const num = (v: string | undefined) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  };
  const dateField = (k: string) => {
    const v = formData.get(k) as string;
    return v ? new Date(v) : null;
  };

  const itemQty = formData.getAll("itemQty") as string[];
  const itemSpecies = formData.getAll("itemSpecies") as string[];
  const itemForms = formData.getAll("itemForms") as string[];
  const itemVolumeBdFt = formData.getAll("itemVolumeBdFt") as string[];
  const itemVolumeCuM = formData.getAll("itemVolumeCuM") as string[];
  const itemValue = formData.getAll("itemValue") as string[];

  const items = itemQty
    .map((qty, i) => ({
      quantity: qty.trim() || null,
      species: itemSpecies[i]?.trim() || null,
      forms: itemForms[i]?.trim() || null,
      volumeBdFt: num(itemVolumeBdFt[i]),
      volumeCuM: num(itemVolumeCuM[i]),
      estimatedValue: num(itemValue[i]),
    }))
    .filter(
      (x) => x.quantity || x.species || x.forms || x.volumeBdFt || x.volumeCuM || x.estimatedValue
    );

  const pairs = (typeKey: string, qtyKey: string, valueKey: string) => {
    const types = formData.getAll(typeKey) as string[];
    const qtys = formData.getAll(qtyKey) as string[];
    const values = formData.getAll(valueKey) as string[];
    return types
      .map((type, i) => ({
        type: type.trim() || null,
        quantity: parseInt(qtys[i] || "1", 10) || 1,
        estimatedValue: num(values[i]),
      }))
      .filter((r) => r.type);
  };

  await prisma.apprehensionRecord.update({
    where: { id },
    data: {
      dateOfApprehension: str("dateOfApprehension"),
      placeOfApprehension: str("placeOfApprehension"),
      apprehendingAgency: str("apprehendingAgency"),
      claimantRespondent: str("claimantRespondent"),
      circumstances: str("circumstances"),
      custodianLocation: str("custodianLocation"),
      otherAgencies: str("otherAgencies"),
      remarks: str("remarks"),
      sourcePlace: str("sourcePlace"),
      gpsCoordinates: str("gpsCoordinates"),
      landClassification: str("landClassification"),
      otherRemarks: str("otherRemarks"),
      caseStatus: str("caseStatus"),
      acpEndorsedToPenro: dateField("acpEndorsedToPenro"),
      acpEndorsedToRo: dateField("acpEndorsedToRo"),     
      items: { deleteMany: {}, create: items },
      conveyances: { deleteMany: {}, create: pairs("convType", "convQty", "convValue") },
      equipment: { deleteMany: {}, create: pairs("equipType", "equipQty", "equipValue") },
    },
  });

  revalidatePath(`/records/${id}`);
  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return id;
}

// Used by the full edit page (saves, then goes to the record)
export async function updateRecord(formData: FormData) {
  const id = await saveRecord(formData);
  redirect(`/records/${id}`);
}

// Used by the modal (saves, stays on the page)
export async function updateRecordInline(formData: FormData) {
  await saveRecord(formData);
}

// Used by the modal to load one record's data
export async function getRecordForEdit(id: number) {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to edit saved records.");
  }

  const r = await prisma.apprehensionRecord.findUnique({
    where: { id },
    include: { items: true, conveyances: true, equipment: true },
  });
  if (!r || r.isDeleted) return null;

  return {
    id: r.id,
    dateOfApprehension: r.dateOfApprehension ?? "",
    placeOfApprehension: r.placeOfApprehension ?? "",
    apprehendingAgency: r.apprehendingAgency ?? "",
    claimantRespondent: r.claimantRespondent ?? "",
    circumstances: r.circumstances ?? "",
    custodianLocation: r.custodianLocation ?? "",
    otherAgencies: r.otherAgencies ?? "",
    remarks: r.remarks ?? "",
    sourcePlace: r.sourcePlace ?? "",
    gpsCoordinates: r.gpsCoordinates ?? "",
    landClassification: r.landClassification ?? "",
    otherRemarks: r.otherRemarks ?? "",
    caseStatus: r.caseStatus ?? "",
    acpEndorsedToPenro: r.acpEndorsedToPenro ? r.acpEndorsedToPenro.toISOString().slice(0, 10) : "",
    acpEndorsedToRo: r.acpEndorsedToRo ? r.acpEndorsedToRo.toISOString().slice(0, 10) : "",    
    items: r.items.map((i) => ({
      qty: i.quantity ?? "",
      species: i.species ?? "",
      forms: i.forms ?? i.description ?? "",
      bdft: i.volumeBdFt != null ? String(i.volumeBdFt) : "",
      cum: i.volumeCuM != null ? String(i.volumeCuM) : "",
      value: i.estimatedValue != null ? String(i.estimatedValue) : "",
    })),
    conveyances: r.conveyances.map((c) => ({
      type: c.type ?? "",
      qty: String(c.quantity),
      value: c.estimatedValue != null ? String(c.estimatedValue) : "",
    })),
    equipment: r.equipment.map((e) => ({
      type: e.type ?? "",
      qty: String(e.quantity),
      value: e.estimatedValue != null ? String(e.estimatedValue) : "",
    })),
  };
}

// ─── Restore / permanent delete ─────────────────────────────────

export async function restoreRecord(formData: FormData) {
  const user = await requireActiveUser();
  // Same roles that can soft-delete may restore
  if (!user || !permissions.softDeleteRecord(user.role as Role)) {
    throw new Error("You don't have permission to restore records.");
  }

  const id = parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid record.");
  }

  const existing = await prisma.apprehensionRecord.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  });
  if (!existing) throw new Error("Record not found.");
  if (!existing.isDeleted) throw new Error("Record is not deleted.");

  await prisma.apprehensionRecord.update({
    where: { id },
    data: { isDeleted: false },
  });

  revalidatePath(`/records/${id}`);
  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function permanentlyDeleteRecord(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireActiveUser();
  if (!user || !permissions.permanentDeleteRecord(user.role as Role)) {
    return {
      ok: false,
      error: "Only Super Admin can permanently delete records. Administrators can soft-delete only.",
    };
  }

  const id = parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Invalid record." };
  }

  const password = (formData.get("password") as string) || "";
  if (!password) return { ok: false, error: "Please enter your password." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Incorrect password." };

  const record = await prisma.apprehensionRecord.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  });
  if (!record) return { ok: false, error: "Record not found." };
  // Must soft-delete first — avoids accidental hard-delete of active records
  if (!record.isDeleted) {
    return {
      ok: false,
      error: "Soft-delete the record first, then permanently delete it from the deleted list.",
    };
  }

  await prisma.$transaction([
    prisma.forestProductItem.deleteMany({ where: { apprehensionRecordId: id } }),
    prisma.conveyance.deleteMany({ where: { apprehensionRecordId: id } }),
    prisma.equipment.deleteMany({ where: { apprehensionRecordId: id } }),
    prisma.fieldValue.deleteMany({ where: { apprehensionRecordId: id } }),
    prisma.apprehensionRecord.delete({ where: { id } }),
  ]);

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { ok: true };
}
