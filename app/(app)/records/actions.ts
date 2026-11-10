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

  // Parse "November 6, 2026", "2026-11-06", or "11/06/2026" → Date (UTC noon)
  const parseFlexibleDate = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const v = raw.trim();
    if (!v) return null;

    // ISO YYYY-MM-DD
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      return new Date(
        Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12),
      );
    }

    // mm/dd/yyyy or m/d/yyyy
    const numeric = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (numeric) {
      return new Date(
        Date.UTC(
          Number(numeric[3]),
          Number(numeric[1]) - 1,
          Number(numeric[2]),
          12,
        ),
      );
    }

    // "November 6, 2026" / "Nov 6, 2026"
    const MONTHS = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const long = v.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
    if (long) {
      const idx = MONTHS.findIndex((m) =>
        m.startsWith(long[1].toLowerCase().slice(0, 3)),
      );
      if (idx >= 0) {
        return new Date(
          Date.UTC(Number(long[3]), idx, Number(long[2]), 12),
        );
      }
    }

    const fallback = new Date(v);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  };

  const dateField = (k: string) => {
    const v = (formData.get(k) as string) || "";
    return parseFlexibleDate(v);
  };

  const MONTH_LABELS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  /** Normalize any accepted date string to "November 6, 2026" (or null) */
  const toLongDateString = (raw: string | null | undefined): string | null => {
    const d = parseFlexibleDate(raw);
    if (!d) return raw?.trim() || null;
    return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };

  // Prefer long text ("November 6, 2026"); fall back to mm/dd/yyyy companion
  const dateOfApprehensionRaw =
    str("dateOfApprehension") || str("dateOfApprehensionNumeric");
  let year = parseInt(String(formData.get("year") ?? ""), 10);
  let month = formData.get("month")
    ? parseInt(String(formData.get("month")), 10)
    : null;
  if (dateOfApprehensionRaw) {
    const d = parseFlexibleDate(dateOfApprehensionRaw);
    if (d) {
      if (!Number.isFinite(year) || year <= 0) year = d.getUTCFullYear();
      if (month == null || !Number.isFinite(month)) month = d.getUTCMonth() + 1;
    }
  }
  if (!Number.isFinite(year) || year <= 0) {
    throw new Error(
      "Date of apprehension is required (could not determine year).",
    );
  }

  // Place: combine sitio / municipality / province from the form
  const placeParts = [
    str("placeSitioBrgy"),
    str("placeMunicipality"),
    str("placeProvince"),
  ].filter(Boolean);
  const placeOfApprehension =
    placeParts.length > 0
      ? placeParts.join(", ")
      : str("placeOfApprehension");

  // GPS: combine northing / easting if provided
  const gpsNorthing = str("gpsNorthing");
  const gpsEasting = str("gpsEasting");
  const gpsCoordinates =
    gpsNorthing || gpsEasting
      ? [gpsNorthing, gpsEasting].filter(Boolean).join(" / ")
      : str("gpsCoordinates");

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
  const itemSpecies = formData.getAll("itemSpecies") as string[];
  const items = itemType
    .map((type, i) => ({
      type: type || null,
      forms: type || null, // keep legacy column populated
      quantity: itemQty[i] || null,
      species: itemSpecies[i]?.trim() || null,
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
        item.species ||
        item.volumeBdFt ||
        item.volumeCuM ||
        item.estimatedValue,
    );

  // Conveyances (§6)
  const convType = formData.getAll("convType") as string[];
  const convPlateNo = formData.getAll("convPlateNo") as string[];
  const convStatus = formData.getAll("convStatus") as string[];
  const convQty = formData.getAll("convQty") as string[];
  const convValue = formData.getAll("convValue") as string[];
  const conveyances = convType
    .map((type, i) => ({
      type: type || null,
      plateNo: convPlateNo[i]?.trim() || null,
      serviceStatus: (convStatus[i] || null) as
        | "SERVICEABLE"
        | "UNSERVICEABLE"
        | null,
      quantity: parseInt(convQty[i] || "1", 10) || 1,
      estimatedValue: convValue[i] ? parseFloat(convValue[i]) : null,
    }))
    .filter((c) => c.type || c.plateNo);

  // Equipment (§7)
  const equipType = formData.getAll("equipType") as string[];
  const equipRegistered = formData.getAll("equipRegistered") as string[];
  const equipStatus = formData.getAll("equipStatus") as string[];
  const equipQty = formData.getAll("equipQty") as string[];
  const equipValue = formData.getAll("equipValue") as string[];
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
      quantity: parseInt(equipQty[i] || "1", 10) || 1,
      estimatedValue: equipValue[i] ? parseFloat(equipValue[i]) : null,
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
      // Always store long form: "November 6, 2026"
      dateOfApprehension: toLongDateString(dateOfApprehensionRaw),
      timeOfApprehension: str("timeOfApprehension"),
      placeOfApprehension,
      gpsCoordinates,
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
      // 11–13 — string dates stored as "November 6, 2026"
      dateOfPromulgation: toLongDateString(
        str("dateOfPromulgation") || str("dateOfPromulgationNumeric"),
      ),
      promulgatedBy: str("promulgatedBy"),
      docketNumber: str("docketNumber"),
      orderOfFinalityDate: toLongDateString(
        str("orderOfFinalityDate") || str("orderOfFinalityDateNumeric"),
      ),
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
      donationFpDate:
        donationMade === true
          ? toLongDateString(
              str("donationFpDate") || str("donationFpDateNumeric"),
            )
          : null,
      donationFpDonor: donationMade === true ? str("donationFpDonor") : null,
      donationFpDonee: donationMade === true ? str("donationFpDonee") : null,
      donationFpVolume:
        donationMade === true ? str("donationFpVolume") : null,
      donationConvDate:
        donationMade === true
          ? toLongDateString(
              str("donationConvDate") || str("donationConvDateNumeric"),
            )
          : null,
      donationConvDonor:
        donationMade === true ? str("donationConvDonor") : null,
      donationConvDonee:
        donationMade === true ? str("donationConvDonee") : null,
      donationEquipDate:
        donationMade === true
          ? toLongDateString(
              str("donationEquipDate") || str("donationEquipDateNumeric"),
            )
          : null,
      donationEquipDonor:
        donationMade === true ? str("donationEquipDonor") : null,
      donationEquipDonee:
        donationMade === true ? str("donationEquipDonee") : null,
      remarks: str("remarks"),
      caseDocumentsUrl: str("caseDocumentsUrl"),
      // Drive links for appraisal / donation documents
      appraisalReportUrl: str("appraisalReportUrl"),
      deedOfDonationUrl: donationMade === true ? str("deedOfDonationUrl") : null,
      terminalReportUrl: donationMade === true ? str("terminalReportUrl") : null,
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

  const scope = await getOfficeScope();
  const id = parseInt(formData.get("id") as string, 10);
  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;
  const num = (v: string | undefined) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  };
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

  // CENRO accounts may only keep their own office
  let cenroOfficeId = parseInt(String(formData.get("cenroOfficeId") ?? ""), 10);
  if (scope?.isCenro && scope.officeId) {
    cenroOfficeId = scope.officeId;
  }

  // Year / month from date of apprehension
  const dateOfApprehensionRaw = str("dateOfApprehension");
  let year = parseInt(String(formData.get("year") ?? ""), 10);
  let month = formData.get("month")
    ? parseInt(String(formData.get("month")), 10)
    : null;
  if (dateOfApprehensionRaw) {
    const d = new Date(dateOfApprehensionRaw);
    if (!Number.isNaN(d.getTime())) {
      if (!Number.isFinite(year) || year <= 0) year = d.getUTCFullYear();
      if (month == null || !Number.isFinite(month)) month = d.getUTCMonth() + 1;
    }
  }

  // Place: combine split fields or fall back to single field
  const placeParts = [
    str("placeSitioBrgy"),
    str("placeMunicipality"),
    str("placeProvince"),
  ].filter(Boolean);
  const placeOfApprehension =
    placeParts.length > 0
      ? placeParts.join(", ")
      : str("placeOfApprehension");

  const gpsNorthing = str("gpsNorthing");
  const gpsEasting = str("gpsEasting");
  const gpsCoordinates =
    gpsNorthing || gpsEasting
      ? [gpsNorthing, gpsEasting].filter(Boolean).join(" / ")
      : str("gpsCoordinates");

  const hasRespondent = yesNo("hasRespondent");
  const claimantRespondent =
    hasRespondent === false
      ? "Abandoned"
      : str("claimantRespondent");

  // Forest products (aligned with New Record form)
  const itemType = formData.getAll("itemType") as string[];
  const itemQty = formData.getAll("itemQty") as string[];
  const itemVolumeBdFt = formData.getAll("itemVolumeBdFt") as string[];
  const itemVolumeCuM = formData.getAll("itemVolumeCuM") as string[];
  const itemCondition = formData.getAll("itemCondition") as string[];
  const itemValue = formData.getAll("itemValue") as string[];
  // Legacy field names still accepted
  const itemSpecies = formData.getAll("itemSpecies") as string[];
  const itemForms = formData.getAll("itemForms") as string[];

  const items = (
    itemType.length
      ? itemType.map((type, i) => ({
          type: type || null,
          forms: type || itemForms[i]?.trim() || null,
          quantity: itemQty[i]?.trim() || null,
          species: itemSpecies[i]?.trim() || null,
          volumeBdFt: num(itemVolumeBdFt[i]),
          volumeCuM: num(itemVolumeCuM[i]),
          conditionStatus: (itemCondition[i] || null) as
            | "GOOD_CONDITION"
            | "DETERIORATING"
            | "DETERIORATED"
            | null,
          estimatedValue: num(itemValue[i]),
        }))
      : itemQty.map((qty, i) => ({
          type: itemForms[i]?.trim() || null,
          forms: itemForms[i]?.trim() || null,
          quantity: qty.trim() || null,
          species: itemSpecies[i]?.trim() || null,
          volumeBdFt: num(itemVolumeBdFt[i]),
          volumeCuM: num(itemVolumeCuM[i]),
          conditionStatus: null as null,
          estimatedValue: num(itemValue[i]),
        }))
  ).filter(
    (x) =>
      x.type ||
      x.quantity ||
      x.species ||
      x.forms ||
      x.volumeBdFt ||
      x.volumeCuM ||
      x.estimatedValue,
  );

  // Conveyances
  const convType = formData.getAll("convType") as string[];
  const convPlateNo = formData.getAll("convPlateNo") as string[];
  const convStatus = formData.getAll("convStatus") as string[];
  const convQty = formData.getAll("convQty") as string[];
  const convValue = formData.getAll("convValue") as string[];
  const conveyances = convType
    .map((type, i) => ({
      type: type.trim() || null,
      plateNo: convPlateNo[i]?.trim() || null,
      serviceStatus: (convStatus[i] || null) as
        | "SERVICEABLE"
        | "UNSERVICEABLE"
        | null,
      quantity: parseInt(convQty[i] || "1", 10) || 1,
      estimatedValue: num(convValue[i]),
    }))
    .filter((c) => c.type || c.plateNo);

  // Equipment
  const equipType = formData.getAll("equipType") as string[];
  const equipRegistered = formData.getAll("equipRegistered") as string[];
  const equipStatus = formData.getAll("equipStatus") as string[];
  const equipQty = formData.getAll("equipQty") as string[];
  const equipValue = formData.getAll("equipValue") as string[];
  const equipment = equipType
    .map((type, i) => ({
      type: type.trim() || null,
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
      quantity: parseInt(equipQty[i] || "1", 10) || 1,
      estimatedValue: num(equipValue[i]),
    }))
    .filter((e) => e.type);

  const acpConducted = yesNo("acpConducted");
  const donationMade = yesNo("donationMade");
  const appraisalFp = yesNo("appraisalForestProducts");
  const appraisalConv = yesNo("appraisalConveyances");
  const appraisalEquip = yesNo("appraisalEquipment");

  const data: Record<string, unknown> = {
    penroOffice: str("penroOffice"),
    penroOfficer: str("penroOfficer"),
    cenroOfficer: str("cenroOfficer"),
    dateOfApprehension: dateOfApprehensionRaw,
    timeOfApprehension: str("timeOfApprehension"),
    placeOfApprehension,
    gpsCoordinates,
    apprehendingAgency: str("apprehendingAgency"),
    apprehendingOfficer: str("apprehendingOfficer"),
    hasRespondent,
    claimantRespondent,
    respondentAddress:
      hasRespondent === true ? str("respondentAddress") : null,
    respondentContact:
      hasRespondent === true ? str("respondentContact") : null,
    acpConducted,
    acpDate: acpConducted === true ? dateField("acpDate") : null,
    acpEndorsedToPenro:
      acpConducted === true
        ? dateField("acpEndorsedToPenro")
        : dateField("acpEndorsedToPenro"),
    acpEndorsedToRo:
      acpConducted === true
        ? dateField("acpEndorsedToRo")
        : dateField("acpEndorsedToRo"),
    dateOfPromulgation: str("dateOfPromulgation"),
    promulgatedBy: str("promulgatedBy"),
    docketNumber: str("docketNumber"),
    appraisalForestProducts: appraisalFp,
    appraisalForestProductsDate:
      appraisalFp === true ? dateField("appraisalForestProductsDate") : null,
    appraisalConveyances: appraisalConv,
    appraisalConveyancesDate:
      appraisalConv === true ? dateField("appraisalConveyancesDate") : null,
    appraisalEquipment: appraisalEquip,
    appraisalEquipmentDate:
      appraisalEquip === true ? dateField("appraisalEquipmentDate") : null,
    donationMade,
    donationFpDate: donationMade === true ? str("donationFpDate") : null,
    donationFpDonor: donationMade === true ? str("donationFpDonor") : null,
    donationFpDonee: donationMade === true ? str("donationFpDonee") : null,
    donationFpVolume: donationMade === true ? str("donationFpVolume") : null,
    donationConvDate: donationMade === true ? str("donationConvDate") : null,
    donationConvDonor: donationMade === true ? str("donationConvDonor") : null,
    donationConvDonee: donationMade === true ? str("donationConvDonee") : null,
    donationEquipDate: donationMade === true ? str("donationEquipDate") : null,
    donationEquipDonor:
      donationMade === true ? str("donationEquipDonor") : null,
    donationEquipDonee:
      donationMade === true ? str("donationEquipDonee") : null,
    remarks: str("remarks"),
    caseDocumentsUrl: str("caseDocumentsUrl"),
    appraisalReportUrl: str("appraisalReportUrl"),
    deedOfDonationUrl: donationMade === true ? str("deedOfDonationUrl") : null,
    terminalReportUrl: donationMade === true ? str("terminalReportUrl") : null,
    sourcePlace: str("sourcePlace"),
    landClassification: str("landClassification"),
    circumstances: str("circumstances"),
    custodianLocation: str("custodianLocation"),
    otherAgencies: str("otherAgencies"),
    otherRemarks: str("otherRemarks"),
    caseStatus: str("caseStatus"),
    items: { deleteMany: {}, create: items },
    conveyances: { deleteMany: {}, create: conveyances },
    equipment: { deleteMany: {}, create: equipment },
  };

  if (Number.isFinite(cenroOfficeId) && cenroOfficeId > 0) {
    data.cenroOfficeId = cenroOfficeId;
  }
  if (Number.isFinite(year) && year > 0) {
    data.year = year;
    data.month = month;
  }

  await prisma.apprehensionRecord.update({
    where: { id },
    data,
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

// Used by the modal to load one record's data (+ office lookup lists for cascading)
export async function getRecordForEdit(id: number) {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to edit saved records.");
  }

  const r = await prisma.apprehensionRecord.findUnique({
    where: { id },
    include: {
      items: true,
      conveyances: true,
      equipment: true,
      cenroOffice: {
        select: {
          id: true,
          name: true,
          penroOfficeId: true,
          penroOffice: { select: { id: true, name: true } },
          defaultOfficer: { select: { name: true } },
        },
      },
    },
  });
  if (!r || r.isDeleted) return null;

  const iso = (d: Date | null | undefined) =>
    d ? d.toISOString().slice(0, 10) : "";

  const yn = (v: boolean | null | undefined) =>
    v === true ? "yes" : v === false ? "no" : "";

  // Split place / GPS for the form (best-effort)
  const placeParts = (r.placeOfApprehension ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const gpsParts = (r.gpsCoordinates ?? "")
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const [penroOfficesRaw, penroOfficers, cenroOfficers, allCenro] =
    await Promise.all([
      prisma.penroOffice.findMany({
        orderBy: { name: "asc" },
        include: { defaultOfficer: { select: { name: true } } },
      }),
      prisma.penroOfficer.findMany({ orderBy: { name: "asc" } }),
      prisma.cenroOfficer.findMany({ orderBy: { name: "asc" } }),
      prisma.cenroOffice.findMany({
        orderBy: { name: "asc" },
        include: {
          penroOffice: { select: { id: true, name: true } },
          defaultOfficer: { select: { name: true } },
        },
      }),
    ]);

  return {
    id: r.id,
    penroOffice: r.penroOffice ?? "",
    penroOfficer: r.penroOfficer ?? "",
    cenroOfficeId: r.cenroOfficeId,
    cenroOfficer: r.cenroOfficer ?? "",
    dateOfApprehension: r.dateOfApprehension ?? "",
    timeOfApprehension: r.timeOfApprehension ?? "",
    placeSitioBrgy: placeParts[0] ?? "",
    placeMunicipality: placeParts[1] ?? "",
    placeProvince: placeParts[2] ?? placeParts.slice(2).join(", "),
    placeOfApprehension: r.placeOfApprehension ?? "",
    gpsNorthing: gpsParts[0] ?? "",
    gpsEasting: gpsParts[1] ?? "",
    gpsCoordinates: r.gpsCoordinates ?? "",
    apprehendingAgency: r.apprehendingAgency ?? "",
    apprehendingOfficer: r.apprehendingOfficer ?? "",
    hasRespondent: yn(r.hasRespondent),
    claimantRespondent: r.claimantRespondent ?? "",
    respondentAddress: r.respondentAddress ?? "",
    respondentContact: r.respondentContact ?? "",
    acpConducted: yn(r.acpConducted),
    acpDate: iso(r.acpDate),
    acpEndorsedToPenro: iso(r.acpEndorsedToPenro),
    acpEndorsedToRo: iso(r.acpEndorsedToRo),
    dateOfPromulgation: r.dateOfPromulgation ?? "",
    promulgatedBy: r.promulgatedBy ?? "",
    docketNumber: r.docketNumber ?? "",
    appraisalForestProducts: yn(r.appraisalForestProducts),
    appraisalForestProductsDate: iso(r.appraisalForestProductsDate),
    appraisalConveyances: yn(r.appraisalConveyances),
    appraisalConveyancesDate: iso(r.appraisalConveyancesDate),
    appraisalEquipment: yn(r.appraisalEquipment),
    appraisalEquipmentDate: iso(r.appraisalEquipmentDate),
    donationMade: yn(r.donationMade),
    donationFpDate: r.donationFpDate ?? "",
    donationFpDonor: r.donationFpDonor ?? "",
    donationFpDonee: r.donationFpDonee ?? "",
    donationFpVolume: r.donationFpVolume ?? "",
    donationConvDate: r.donationConvDate ?? "",
    donationConvDonor: r.donationConvDonor ?? "",
    donationConvDonee: r.donationConvDonee ?? "",
    donationEquipDate: r.donationEquipDate ?? "",
    donationEquipDonor: r.donationEquipDonor ?? "",
    donationEquipDonee: r.donationEquipDonee ?? "",
    remarks: r.remarks ?? "",
    sourcePlace: r.sourcePlace ?? "",
    landClassification: r.landClassification ?? "",
    circumstances: r.circumstances ?? "",
    custodianLocation: r.custodianLocation ?? "",
    otherAgencies: r.otherAgencies ?? "",
    otherRemarks: r.otherRemarks ?? "",
    caseStatus: r.caseStatus ?? "",
    caseDocumentsUrl: r.caseDocumentsUrl ?? "",
    appraisalReportUrl: r.appraisalReportUrl ?? "",
    deedOfDonationUrl: r.deedOfDonationUrl ?? "",
    terminalReportUrl: r.terminalReportUrl ?? "",
    items: r.items.map((i) => ({
      type: i.type ?? i.forms ?? "",
      qty: i.quantity ?? "",
      species: i.species ?? "",
      forms: i.forms ?? i.description ?? "",
      bdft: i.volumeBdFt != null ? String(i.volumeBdFt) : "",
      cum: i.volumeCuM != null ? String(i.volumeCuM) : "",
      condition: i.conditionStatus ?? "",
      value: i.estimatedValue != null ? String(i.estimatedValue) : "",
    })),
    conveyances: r.conveyances.map((c) => ({
      type: c.type ?? "",
      plateNo: c.plateNo ?? "",
      status: c.serviceStatus ?? "",
      qty: String(c.quantity),
      value: c.estimatedValue != null ? String(c.estimatedValue) : "",
    })),
    equipment: r.equipment.map((e) => ({
      type: e.type ?? "",
      registered:
        e.registered === true ? "yes" : e.registered === false ? "no" : "",
      status: e.serviceStatus ?? "",
      qty: String(e.quantity),
      value: e.estimatedValue != null ? String(e.estimatedValue) : "",
    })),
    // Lookups for cascading dropdowns
    lookups: {
      penroOffices: penroOfficesRaw.map((p) => ({
        id: p.id,
        name: p.name,
        defaultOfficerName: p.defaultOfficer?.name ?? null,
      })),
      penroOfficers: penroOfficers.map((o) => ({ id: o.id, name: o.name })),
      cenroOfficers: cenroOfficers.map((o) => ({ id: o.id, name: o.name })),
      cenroOffices: allCenro.map((o) => ({
        id: o.id,
        name: o.name,
        penroOfficeId: o.penroOfficeId,
        penroOfficeName: o.penroOffice?.name ?? null,
        defaultOfficerName: o.defaultOfficer?.name ?? null,
      })),
    },
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
