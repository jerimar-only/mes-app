"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// Column positions in the PENRO consolidated sheet (0 = column A)
const COL = {
  inc: 1, date: 2, place: 3, source: 4, gps: 5, land: 6, officers: 7, claimant: 8,
  product: 9, cuM: 10, bdFt: 11, value: 12,
  convQty: 13, conv: 14, convValue: 15,
  equipQty: 16, equip: 17, equipValue: 18,
  impounded: 19, otherRemarks: 20, remarks: 21,
  acpPenro: 22, acpRo: 23, caseStatus: 24,
} as const;

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_LABELS = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));

type RowResult = { row: number; message: string };

type ItemData = {
  description: string | null;
  volumeCuM: number | null;
  volumeBdFt: number | null;
  estimatedValue: number | null;
};
type PairData = { type: string; quantity: number; estimatedValue: number | null };

type Entry = {
  rowNum: number;
  key: string;
  data: Prisma.ApprehensionRecordCreateManyInput;
  items: ItemData[];
  convs: PairData[];
  equips: PairData[];
};

// "CENRO APARRI" and "APARRI" both become "APARRI"
const officeKey = (name: unknown) =>
  String(name ?? "").trim().toUpperCase().replace(/^CENRO\s+/, "").replace(/\s+/g, " ");

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";

// Text cell → string, or null when empty or a placeholder like "None" / "N/A"
const PLACEHOLDER = /^(none|n\/a|na|n\.a\.|-|—|0)$/i;
const text = (v: unknown) => {
  if (isEmpty(v) || v instanceof Date) return null;
  const s = String(v).trim();
  return PLACEHOLDER.test(s) ? null : s;
};

// "1,234.50", "1, 549.0", "₱1,234.50" → number
const toNum = (v: unknown) => {
  if (isEmpty(v) || v instanceof Date) return null;
  const n = parseFloat(String(v).replace(/[₱,\s]/g, ""));
  return Number.isNaN(n) ? null : n;
};

const toQty = (v: unknown) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
};

// Excel date → plain calendar date (the +12h shift avoids timezone off-by-one)
function asDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const s = new Date(v.getTime() + 12 * 3600 * 1000);
    return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  }
  return null;
}

// Month from typed text, tolerant of typos like "Januay" / "Feruary"
function monthFromText(v: unknown): number | null {
  if (isEmpty(v)) return null;
  const word = String(v).toLowerCase().match(/[a-z]{2,}/)?.[0];
  if (!word) return null;
  let idx = MONTHS.findIndex((m) => m.startsWith(word.slice(0, 3)));
  if (idx < 0) {
    const two = MONTHS.map((m, i) => (m.startsWith(word.slice(0, 2)) ? i : -1)).filter((i) => i >= 0);
    if (two.length === 1) idx = two[0];
  }
  return idx >= 0 ? idx + 1 : null;
}

const CHUNK = 200;

export async function uploadExcel(formData: FormData): Promise<{
  imported: number;
  skipped: number;
  skippedRows: RowResult[];
  totalRead: number;
  errors: RowResult[];
}> {
  const session = await getSession();
  if (!session || !permissions.uploadExcel(session.role as Role)) {
    throw new Error("You don't have permission to upload records.");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file was uploaded.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const firstRowOffset = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.r : 0;

  // Find the header row; data starts after the two-row header
  const headerIdx = rows.slice(0, 15).findIndex((r) =>
    r?.some((c) => typeof c === "string" && /DATE OF APPREHENSION/i.test(c))
  );
  if (headerIdx < 0) {
    throw new Error('This file doesn\'t match the template: the "DATE OF APPREHENSION" header was not found.');
  }
  const start = headerIdx + 2;

  // Year from the title ("... FOR CY 2026"), used when a date is typed as text
  const titleText = rows.slice(0, 5).flat().filter((c) => typeof c === "string").join(" ");
  const titleYear = parseInt(titleText.match(/CY\s*(\d{4})/i)?.[1] ?? "", 10) || null;

  const offices = await prisma.cenroOffice.findMany();
  const officeByKey = new Map(offices.map((o) => [officeKey(o.name), o]));
  const validList = offices.map((o) => o.name).join(", ");

  const errors: RowResult[] = [];
  const entries: Entry[] = [];

  let lastOffice: { id: number; name: string } | null = null;
  let lastEntry: Entry | null = null;

  // ---- Phase 1: read the whole sheet in memory (no database calls) ----
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1 + firstRowOffset;
    if (!row || row.every(isEmpty)) continue;

    const inc = row[COL.inc];
    const dateCell = row[COL.date];

    // Subtotal / grand total lines
    if (
      (typeof dateCell === "string" && /total/i.test(dateCell)) ||
      (typeof inc === "string" && /total/i.test(inc))
    ) {
      continue;
    }

    // Office heading row: text in column B and nothing else on the row
    if (typeof inc === "string" && !isEmpty(inc) && row.slice(2).every(isEmpty)) {
      const office = officeByKey.get(officeKey(inc));
      lastEntry = null;
      if (office) {
        lastOffice = office;
      } else {
        lastOffice = null;
        errors.push({ row: rowNum, message: `Unknown CENRO office "${inc}". Valid offices: ${validList}.` });
      }
      continue;
    }

    const productText = text(row[COL.product]);
    const cuM = toNum(row[COL.cuM]);
    const bdFt = toNum(row[COL.bdFt]);
    const value = toNum(row[COL.value]);
    const hasProduct = !!(productText || cuM || bdFt || value);
    const convType = text(row[COL.conv]);
    const equipType = text(row[COL.equip]);

    const item: ItemData = { description: productText, volumeCuM: cuM, volumeBdFt: bdFt, estimatedValue: value };
    const conv: PairData | null = convType
      ? { type: convType, quantity: toQty(row[COL.convQty]), estimatedValue: toNum(row[COL.convValue]) }
      : null;
    const equip: PairData | null = equipType
      ? { type: equipType, quantity: toQty(row[COL.equipQty]), estimatedValue: toNum(row[COL.equipValue]) }
      : null;

    const isNewRecord = !isEmpty(dateCell) || typeof inc === "number";

    // Continuation row: extra conveyance / equipment / product of the record above
    if (!isNewRecord) {
      if (!hasProduct && !conv && !equip) continue; // footer text like "Approved by:"
      if (!lastEntry) {
        errors.push({ row: rowNum, message: "Extra item row has no record above it to attach to." });
        continue;
      }
      if (hasProduct) lastEntry.items.push(item);
      if (conv) lastEntry.convs.push(conv);
      if (equip) lastEntry.equips.push(equip);
      continue;
    }

    // ---- New record ----
    lastEntry = null;
    if (!lastOffice) {
      errors.push({ row: rowNum, message: "No CENRO office heading found above this row." });
      continue;
    }

    const parsedDate = asDate(dateCell);
    let year: number | null;
    let month: number | null;
    let dateText: string | null;
    if (parsedDate) {
      year = parsedDate.getUTCFullYear();
      month = parsedDate.getUTCMonth() + 1;
      dateText = `${MONTH_LABELS[month - 1]} ${parsedDate.getUTCDate()}, ${year}`;
    } else {
      dateText = text(dateCell);
      month = monthFromText(dateText);
      year = parseInt(String(dateText ?? "").match(/\b(20\d{2})\b/)?.[1] ?? "", 10) || titleYear;
    }
    if (!month || !year) {
      errors.push({ row: rowNum, message: `Could not read the date "${dateCell ?? ""}".` });
      continue;
    }

    const placeOfApprehension = text(row[COL.place]);
    const claimantRespondent = text(row[COL.claimant]);

    const entry: Entry = {
      rowNum,
      // Includes the products so two records on the same day/place/claimant are not confused
      key: [
        lastOffice.id,
        year,
        dateText ?? "",
        placeOfApprehension ?? "",
        claimantRespondent ?? "",
        productText ?? "",
        bdFt ?? "",
      ].join("|"),
      data: {
        cenroOfficeId: lastOffice.id,
        year,
        month,
        dateOfApprehension: dateText,
        placeOfApprehension,
        sourcePlace: text(row[COL.source]),
        gpsCoordinates: text(row[COL.gps]),
        landClassification: text(row[COL.land]),
        apprehendingAgency: text(row[COL.officers]),
        claimantRespondent,
        custodianLocation: text(row[COL.impounded]),
        otherRemarks: text(row[COL.otherRemarks]),
        remarks: text(row[COL.remarks]),
        acpEndorsedToPenro: asDate(row[COL.acpPenro]),
        acpEndorsedToRo: asDate(row[COL.acpRo]),
        caseStatus: text(row[COL.caseStatus]),
        status: "UNKNOWN",
      },
      items: hasProduct ? [item] : [],
      convs: conv ? [conv] : [],
      equips: equip ? [equip] : [],
    };
    entries.push(entry);
    lastEntry = entry;
  }

  if (entries.length === 0) {
    return { imported: 0, skipped: 0, skippedRows: [], totalRead: 0, errors };
  }

  // ---- Phase 2: one query to find records that already exist ----
  const years = [...new Set(entries.map((e) => e.data.year))];
  const existing = await prisma.apprehensionRecord.findMany({
    where: { isDeleted: false, year: { in: years } },
    select: {
      cenroOfficeId: true,
      year: true,
      dateOfApprehension: true,
      placeOfApprehension: true,
      claimantRespondent: true,
      items: {
        select: { description: true, volumeBdFt: true },
        orderBy: { id: "asc" },
        take: 1,
      },
    },
  });
  const existingKeys = new Set(
    existing.map((r) =>
      [
        r.cenroOfficeId,
        r.year,
        r.dateOfApprehension ?? "",
        r.placeOfApprehension ?? "",
        r.claimantRespondent ?? "",
        r.items[0]?.description ?? "",
        r.items[0]?.volumeBdFt ?? "",
      ].join("|")
    )
  );

  const fresh = entries.filter((e) => !existingKeys.has(e.key));
  const skippedRows: RowResult[] = entries
    .filter((e) => existingKeys.has(e.key))
    .map((e) => ({
      row: e.rowNum,
      message: "Already in the system (same office, date, place, claimant and products).",
    }));
  const skipped = skippedRows.length;

  // ---- Phase 3: bulk insert (a handful of queries instead of hundreds) ----
  let imported = 0;
  for (let s = 0; s < fresh.length; s += CHUNK) {
    const chunk = fresh.slice(s, s + CHUNK);
    try {
      await prisma.$transaction(
        async (tx) => {
          const created = await tx.apprehensionRecord.createManyAndReturn({
            data: chunk.map((e) => e.data),
            select: { id: true },
          });
          if (created.length !== chunk.length) throw new Error("Insert count mismatch");

          const items = chunk.flatMap((e, i) =>
            e.items.map((x) => ({ ...x, apprehensionRecordId: created[i].id }))
          );
          const convs = chunk.flatMap((e, i) =>
            e.convs.map((x) => ({ ...x, apprehensionRecordId: created[i].id }))
          );
          const equips = chunk.flatMap((e, i) =>
            e.equips.map((x) => ({ ...x, apprehensionRecordId: created[i].id }))
          );

          if (items.length) await tx.forestProductItem.createMany({ data: items });
          if (convs.length) await tx.conveyance.createMany({ data: convs });
          if (equips.length) await tx.equipment.createMany({ data: equips });
        },
        { timeout: 60000, maxWait: 10000 }
      );
      imported += chunk.length;
    } catch {
      errors.push({
        row: chunk[0].rowNum,
        message: `Database error: the records from row ${chunk[0].rowNum} to row ${chunk[chunk.length - 1].rowNum} were not saved.`,
      });
    }
  }

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { imported, skipped, skippedRows, totalRead: entries.length, errors };
}