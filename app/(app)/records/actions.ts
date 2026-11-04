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

  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;
  const yesNo = (k: string): boolean | null => {
    const v = (formData.get(k) as string) || "";
    if (v === "yes") return true;
    if (v === "no") return false;
    return null;
  };
  const dateField = (k: string) => {
    const v = formData.get(k) as string;
    return v ? new Date(v) : null;
  };

  const year = parseInt(formData.get("year") as string, 10);
  const month = formData.get("month")
    ? parseInt(formData.get("month") as string, 10)
    : null;

  // 9. Respondent — NO → "Abandoned"
  const hasRespondent = yesNo("hasRespondent");
  const claimantRespondent =
    hasRespondent === false
      ? "Abandoned"
      : str("claimantRespondent");

  // Forest products (§5)
  const itemType = formData.getAll("itemType") as string[];
  const itemQty = formData.getAll("itemQty") as string[];
  const itemVolumeBdFt = formData.getAll("itemVolumeBdFt") as string[];
  const itemVolumeCuM = formData.getAll("itemVolumeCuM") as string[];
  const itemCondition = formData.getAll("itemCondition") as string[];
  const itemValue = formData.getAll("itemValue") as string[];
  const items = itemType
    .map((type, i) => ({
      type: type || null,
      forms: type || null, // keep legacy column populated
      quantity: itemQty[i] || null,
      volumeBdFt: itemVolumeBdFt[i] ? parseFloat(itemVolumeBdFt[i]) : null,
      volumeCuM: itemVolumeCuM[i] ? parseFloat(itemVolumeCuM[i]) : null,
      conditionStatus: (itemCondition[i] || null) as
        | "GOOD_CONDITION"
        | "DETERIORATING"
        | "DETERIORATED"
        | null,
      estimatedValue: itemValue[i] ? parseFloat(itemValue[i]) : null,
    }))
    .filter(
      (item) =>
        item.type ||
        item.quantity ||
        item.volumeBdFt ||
        item.volumeCuM ||
        item.estimatedValue,
    );

  // Conveyances (§6)
  const convType = formData.getAll("convType") as string[];
  const convPlateNo = formData.getAll("convPlateNo") as string[];
  const convStatus = formData.getAll("convStatus") as string[];
  const conveyances = convType
    .map((type, i) => ({
      type: type || null,
      plateNo: convPlateNo[i]?.trim() || null,
      serviceStatus: (convStatus[i] || null) as
        | "SERVICEABLE"
        | "UNSERVICEABLE"
        | null,
      quantity: 1,
    }))
    .filter((c) => c.type || c.plateNo);

  // Equipment (§7)
  const equipType = formData.getAll("equipType") as string[];
  const equipRegistered = formData.getAll("equipRegistered") as string[];
  const equipStatus = formData.getAll("equipStatus") as string[];
  const equipment = equipType
    .map((type, i) => ({
      type: type || null,
      registered:
        equipRegistered[i] === "yes"
          ? true
          : equipRegistered[i] === "no"
            ? false
            : null,
      serviceStatus: (equipStatus[i] || null) as
        | "SERVICEABLE"
        | "UNSERVICEABLE"
        | null,
      quantity: 1,
    }))
    .filter((e) => e.type);

  const acpConducted = yesNo("acpConducted");
  const donationMade = yesNo("donationMade");
  const appraisalFp = yesNo("appraisalForestProducts");
  const appraisalConv = yesNo("appraisalConveyances");
  const appraisalEquip = yesNo("appraisalEquipment");

  const record = await prisma.apprehensionRecord.create({
    data: {
      // 1–2
      penroOffice: str("penroOffice"),
      penroOfficer: str("penroOfficer"),
      cenroOfficeId,
      cenroOfficer: str("cenroOfficer"),
      // 3–4
      year,
      month,
      dateOfApprehension: str("dateOfApprehension"),
      timeOfApprehension: str("timeOfApprehension"),
      placeOfApprehension: str("placeOfApprehension"),
      gpsCoordinates: str("gpsCoordinates"),
      // 8
      apprehendingAgency: str("apprehendingAgency"),
      apprehendingOfficer: str("apprehendingOfficer"),
      // 9
      hasRespondent,
      claimantRespondent,
      respondentAddress:
        hasRespondent === true ? str("respondentAddress") : null,
      respondentContact:
        hasRespondent === true ? str("respondentContact") : null,
      // 10
      acpConducted,
      acpDate: acpConducted === true ? dateField("acpDate") : null,
      acpEndorsedToPenro:
        acpConducted === true ? dateField("acpEndorsedToPenro") : null,
      acpEndorsedToRo:
        acpConducted === true ? dateField("acpEndorsedToRo") : null,
      // 11–13
      dateOfPromulgation: str("dateOfPromulgation"),
      promulgatedBy: str("promulgatedBy"),
      docketNumber: str("docketNumber"),
      // 14–16
      appraisalForestProducts: appraisalFp,
      appraisalForestProductsDate:
        appraisalFp === true
          ? dateField("appraisalForestProductsDate")
          : null,
      appraisalConveyances: appraisalConv,
      appraisalConveyancesDate:
        appraisalConv === true
          ? dateField("appraisalConveyancesDate")
          : null,
      appraisalEquipment: appraisalEquip,
      appraisalEquipmentDate:
        appraisalEquip === true
          ? dateField("appraisalEquipmentDate")
          : null,
      // 17
      donationMade,
      donationFpDate: donationMade === true ? str("donationFpDate") : null,
      donationFpDonor: donationMade === true ? str("donationFpDonor") : null,
      donationFpDonee: donationMade === true ? str("donationFpDonee") : null,
      donationFpVolume:
        donationMade === true ? str("donationFpVolume") : null,
      donationConvDate:
        donationMade === true ? str("donationConvDate") : null,
      donationConvDonor:
        donationMade === true ? str("donationConvDonor") : null,
      donationConvDonee:
        donationMade === true ? str("donationConvDonee") : null,
      donationEquipDate:
        donationMade === true ? str("donationEquipDate") : null,
      donationEquipDonor:
        donationMade === true ? str("donationEquipDonor") : null,
      donationEquipDonee:
        donationMade === true ? str("donationEquipDonee") : null,
      remarks: str("remarks"),
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
