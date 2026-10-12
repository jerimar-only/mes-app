"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/** Editable scalar fields for bulk update (matches full-view export headers). */
export type BulkFieldKey =
  | "dateOfApprehension"
  | "placeOfApprehension"
  | "sourcePlace"
  | "gpsCoordinates"
  | "landClassification"
  | "apprehendingAgency"
  | "claimantRespondent"
  | "circumstances"
  | "custodianLocation"
  | "otherAgencies"
  | "otherRemarks"
  | "remarks"
  | "caseStatus"
  | "status"
  | "docketNumber"
  | "orderOfFinalityDate"
  | "acpEndorsedToPenro"
  | "acpEndorsedToRo"
  | "cenroOffice";

export type BulkRow = {
  id: number;
  /** Current values in DB (for diff / display) */
  current: Partial<Record<BulkFieldKey, string>>;
  /** Values from Excel / edited in the grid */
  next: Partial<Record<BulkFieldKey, string>>;
  /** True when the ID was found in the database */
  found: boolean;
  error?: string;
};

const HEADER_MAP: Record<string, BulkFieldKey> = {
  "cenro office": "cenroOffice",
  "date of apprehension": "dateOfApprehension",
  "place of apprehension": "placeOfApprehension",
  "source of forest products": "sourcePlace",
  "gps coordinates": "gpsCoordinates",
  "land classification": "landClassification",
  "apprehending officers": "apprehendingAgency",
  "claimant/owner": "claimantRespondent",
  circumstances: "circumstances",
  "place impounded": "custodianLocation",
  "other agencies": "otherAgencies",
  "other remarks": "otherRemarks",
  remarks: "remarks",
  "case status": "caseStatus",
  status: "status",
  "docket number": "docketNumber",
  "docket #": "docketNumber",
  "order of finality date": "orderOfFinalityDate",
  "finality date": "orderOfFinalityDate",
  "acp endorsed to penro": "acpEndorsedToPenro",
  "acp to penro": "acpEndorsedToPenro",
  "acp endorsed to ro": "acpEndorsedToRo",
  "acp to ro": "acpEndorsedToRo",
};

const STATUS_FROM_LABEL: Record<string, string> = {
  "for resolution": "FOR_RESOLUTION",
  "under adjudication": "UNDER_ADJUDICATION",
  confiscated: "CONFISCATED",
  donated: "DONATED",
  released: "RELEASED",
  "needs review": "UNKNOWN",
  unknown: "UNKNOWN",
  for_resolution: "FOR_RESOLUTION",
  under_adjudication: "UNDER_ADJUDICATION",
};

const STATUS_TO_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

function normHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    const s = new Date(v.getTime() + 12 * 3600 * 1000);
    return s.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function isoOrText(v: string): string {
  if (!v) return "";
  // Already ISO-ish
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return v;
}

function parseStatus(v: string): string {
  if (!v) return "";
  const key = v.trim().toLowerCase();
  if (STATUS_FROM_LABEL[key]) return STATUS_FROM_LABEL[key];
  const upper = v.trim().toUpperCase().replace(/\s+/g, "_");
  if (STATUS_TO_LABEL[upper]) return upper;
  return v.trim().toUpperCase();
}

function recordToCurrent(r: {
  dateOfApprehension: string | null;
  placeOfApprehension: string | null;
  sourcePlace: string | null;
  gpsCoordinates: string | null;
  landClassification: string | null;
  apprehendingAgency: string | null;
  claimantRespondent: string | null;
  circumstances: string | null;
  custodianLocation: string | null;
  otherAgencies: string | null;
  otherRemarks: string | null;
  remarks: string | null;
  caseStatus: string | null;
  status: string;
  docketNumber: string | null;
  orderOfFinalityDate: string | null;
  acpEndorsedToPenro: Date | null;
  acpEndorsedToRo: Date | null;
  cenroOffice: { name: string };
}): Partial<Record<BulkFieldKey, string>> {
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  return {
    cenroOffice: r.cenroOffice.name,
    dateOfApprehension: r.dateOfApprehension ?? "",
    placeOfApprehension: r.placeOfApprehension ?? "",
    sourcePlace: r.sourcePlace ?? "",
    gpsCoordinates: r.gpsCoordinates ?? "",
    landClassification: r.landClassification ?? "",
    apprehendingAgency: r.apprehendingAgency ?? "",
    claimantRespondent: r.claimantRespondent ?? "",
    circumstances: r.circumstances ?? "",
    custodianLocation: r.custodianLocation ?? "",
    otherAgencies: r.otherAgencies ?? "",
    otherRemarks: r.otherRemarks ?? "",
    remarks: r.remarks ?? "",
    caseStatus: r.caseStatus ?? "",
    status: STATUS_TO_LABEL[r.status] ?? r.status,
    docketNumber: r.docketNumber ?? "",
    orderOfFinalityDate: r.orderOfFinalityDate ?? "",
    acpEndorsedToPenro: iso(r.acpEndorsedToPenro),
    acpEndorsedToRo: iso(r.acpEndorsedToRo),
  };
}

export async function parseBulkExcel(formData: FormData): Promise<{
  rows: BulkRow[];
  errors: string[];
}> {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to bulk-update records.");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file was uploaded.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  });

  if (!raw.length) {
    return { rows: [], errors: ["The spreadsheet is empty."] };
  }

  // Find header row (must contain ID)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const cells = (raw[i] ?? []).map(normHeader);
    if (cells.includes("id")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    return {
      rows: [],
      errors: [
        'No "ID" column found. Export from Full view first, edit that file, then upload it here.',
      ],
    };
  }

  const headers = (raw[headerIdx] ?? []).map(normHeader);
  const idCol = headers.indexOf("id");
  const colToField = new Map<number, BulkFieldKey>();
  headers.forEach((h, i) => {
    if (i === idCol) return;
    const field = HEADER_MAP[h];
    if (field) colToField.set(i, field);
  });

  if (colToField.size === 0) {
    return {
      rows: [],
      errors: [
        "No recognized columns found. Use an export from Full view (or the bulk-update template).",
      ],
    };
  }

  const parsed: { id: number; next: Partial<Record<BulkFieldKey, string>>; rowNum: number }[] =
    [];
  const parseErrors: string[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }
    const idRaw = row[idCol];
    const id = parseInt(String(idRaw ?? "").replace(/[^\d]/g, ""), 10);
    if (!id || Number.isNaN(id)) {
      parseErrors.push(`Row ${i + 1}: missing or invalid ID.`);
      continue;
    }
    const next: Partial<Record<BulkFieldKey, string>> = {};
    colToField.forEach((field, col) => {
      let v = cellStr(row[col]);
      if (field === "status") v = parseStatus(v);
      if (field === "acpEndorsedToPenro" || field === "acpEndorsedToRo") {
        v = isoOrText(v);
      }
      next[field] = v;
    });
    // Store status as enum code for apply; display label in grid is fine
    if (next.status) {
      next.status = parseStatus(next.status);
    }
    parsed.push({ id, next, rowNum: i + 1 });
  }

  if (parsed.length === 0) {
    return {
      rows: [],
      errors: parseErrors.length
        ? parseErrors
        : ["No data rows with a valid ID were found."],
    };
  }

  // Deduplicate by ID (last wins)
  const byId = new Map<number, (typeof parsed)[0]>();
  for (const p of parsed) byId.set(p.id, p);

  const ids = [...byId.keys()];
  const existing = await prisma.apprehensionRecord.findMany({
    where: { id: { in: ids } },
    include: { cenroOffice: { select: { name: true } } },
  });
  const existingById = new Map(existing.map((r) => [r.id, r]));

  const offices = await prisma.cenroOffice.findMany();
  const officeByKey = new Map(
    offices.map((o) => [
      o.name
        .trim()
        .toUpperCase()
        .replace(/^CENRO\s+/, "")
        .replace(/\s+/g, " "),
      o,
    ]),
  );

  const rows: BulkRow[] = [];
  for (const [id, p] of byId) {
    const rec = existingById.get(id);
    if (!rec) {
      rows.push({
        id,
        current: {},
        next: p.next,
        found: false,
        error: "Record not found in the database.",
      });
      continue;
    }

    // Resolve office name if provided
    if (p.next.cenroOffice) {
      const key = p.next.cenroOffice
        .trim()
        .toUpperCase()
        .replace(/^CENRO\s+/, "")
        .replace(/\s+/g, " ");
      if (!officeByKey.has(key) && !offices.some((o) => o.name === p.next.cenroOffice)) {
        rows.push({
          id,
          current: recordToCurrent(rec),
          next: p.next,
          found: true,
          error: `Unknown CENRO office "${p.next.cenroOffice}".`,
        });
        continue;
      }
    }

    rows.push({
      id,
      current: recordToCurrent(rec),
      next: {
        ...p.next,
        // Show status as label in the grid for readability
        status: p.next.status
          ? STATUS_TO_LABEL[p.next.status] ?? p.next.status
          : p.next.status,
      },
      found: true,
    });
  }

  rows.sort((a, b) => a.id - b.id);

  return { rows, errors: parseErrors };
}

export type ApplyPayload = {
  id: number;
  fields: Partial<Record<BulkFieldKey, string>>;
}[];

export async function applyBulkUpdate(payload: ApplyPayload): Promise<{
  updated: number;
  failed: { id: number; message: string }[];
}> {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to bulk-update records.");
  }

  if (!payload?.length) {
    return { updated: 0, failed: [] };
  }

  const offices = await prisma.cenroOffice.findMany();
  const officeByKey = new Map(
    offices.map((o) => [
      o.name
        .trim()
        .toUpperCase()
        .replace(/^CENRO\s+/, "")
        .replace(/\s+/g, " "),
      o.id,
    ]),
  );
  // Also map full name
  for (const o of offices) {
    officeByKey.set(o.name.trim().toUpperCase(), o.id);
  }

  const failed: { id: number; message: string }[] = [];
  let updated = 0;

  const CHUNK = 50;
  for (let s = 0; s < payload.length; s += CHUNK) {
    const chunk = payload.slice(s, s + CHUNK);
    for (const item of chunk) {
      try {
        const data: Record<string, unknown> = {};
        const f = item.fields;

        const str = (k: BulkFieldKey) => {
          if (!(k in f)) return;
          const v = (f[k] ?? "").trim();
          data[k] = v === "" ? null : v;
        };

        str("dateOfApprehension");
        str("placeOfApprehension");
        str("sourcePlace");
        str("gpsCoordinates");
        str("landClassification");
        str("apprehendingAgency");
        str("claimantRespondent");
        str("circumstances");
        str("custodianLocation");
        str("otherAgencies");
        str("otherRemarks");
        str("remarks");
        str("caseStatus");
        str("docketNumber");
        str("orderOfFinalityDate");

        if ("status" in f && f.status != null) {
          data.status = parseStatus(f.status) || "UNKNOWN";
        }

        if ("acpEndorsedToPenro" in f) {
          const v = (f.acpEndorsedToPenro ?? "").trim();
          data.acpEndorsedToPenro = v ? new Date(v) : null;
        }
        if ("acpEndorsedToRo" in f) {
          const v = (f.acpEndorsedToRo ?? "").trim();
          data.acpEndorsedToRo = v ? new Date(v) : null;
        }

        if ("cenroOffice" in f && f.cenroOffice) {
          const key = f.cenroOffice
            .trim()
            .toUpperCase()
            .replace(/^CENRO\s+/, "")
            .replace(/\s+/g, " ");
          const officeId =
            officeByKey.get(key) ??
            officeByKey.get(f.cenroOffice.trim().toUpperCase());
          if (!officeId) {
            failed.push({
              id: item.id,
              message: `Unknown office "${f.cenroOffice}".`,
            });
            continue;
          }
          data.cenroOfficeId = officeId;
        }

        if (Object.keys(data).length === 0) {
          failed.push({ id: item.id, message: "No fields to update." });
          continue;
        }

        await prisma.apprehensionRecord.update({
          where: { id: item.id },
          data,
        });
        updated += 1;
      } catch (e) {
        failed.push({
          id: item.id,
          message: e instanceof Error ? e.message : "Update failed.",
        });
      }
    }
  }

  revalidatePath("/records");
  revalidatePath("/records/full");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { updated, failed };
}
