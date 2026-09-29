// FILE: app/upload/actions.ts  (replace the whole file)

"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// "CENRO APARRI" and "APARRI" both become "APARRI", so either spelling matches.
const officeKey = (name: unknown) =>
  String(name ?? "").trim().toUpperCase().replace(/^CENRO\s+/, "").replace(/\s+/g, " ");

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

type RowResult = { row: number; ok: boolean; message: string };

const cellText = (v: unknown) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

// Reads numbers like "1,234.50", "1, 549.0" or "₱1,234.50". Returns null if it can't.
const toNum = (v: unknown) => {
  const s = cellText(v);
  if (!s) return null;
  const n = parseFloat(s.replace(/[₱,\s]/g, ""));
  return Number.isNaN(n) ? null : n;
};

const toQty = (v: unknown) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
};

// Accepts 1-12, "9", "Sept", "September". Returns null if it can't tell.
function monthFromValue(v: unknown): number | null {
  const s = cellText(v);
  if (!s) return null;
  if (/^\d{1,2}$/.test(s)) {
    const n = parseInt(s, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (s.length < 3) return null;
  const idx = MONTHS.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3)));
  return idx >= 0 ? idx + 1 : null;
}

// Fallback: find a month name anywhere in the date text, e.g. "September 21, 2026".
function monthFromDateText(v: unknown): number | null {
  const s = cellText(v);
  if (!s) return null;
  const m = s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  return m ? monthFromValue(m[1]) : null;
}

export async function uploadExcel(formData: FormData): Promise<{
  imported: number;
  errors: RowResult[];
}> {
  const session = await getSession();
  if (!session || !permissions.uploadExcel(session.role as Role)) {
    throw new Error("You don't have permission to upload records.");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    throw new Error("No file was uploaded.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const dataRows = rows.slice(1);

  // Use the offices that already exist in the database. Never create new ones.
  const existingOffices = await prisma.cenroOffice.findMany();
  const officeByKey = new Map<string, { id: number; name: string }>();
  for (const o of existingOffices) officeByKey.set(officeKey(o.name), o);
  const validList = existingOffices.map((o) => o.name).join(", ");

  const results: RowResult[] = [];
  let imported = 0;

  // Carried down from the last row where each was given explicitly.
  // Many rows leave Office / Year / Month blank on purpose, meaning
  // "same as the row above" rather than "missing".
  let lastOffice: { id: number; name: string } | null = null;
  let lastYear: number | null = null;
  let lastMonth: number | null = null;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i];
    if (!row || row.every((cell) => cell === null || cell === "")) continue;

    const [
      officeCell, yearCell, monthCell, dateOfApprehension, placeOfApprehension,
      apprehendingAgency, claimantRespondent, circumstances, custodianLocation,
      otherAgencies, remarks,
      itemQty, itemSpecies, itemForms, itemVolumeBdFt, itemVolumeCuM, itemValue,
      convType, convQty,
      equipType, equipQty,
      convValue, equipValue, // optional columns V and W
    ] = row;

    // ---- Office: use this row's value, or carry down the last one ----
    let office: { id: number; name: string } | null = null;
    if (cellText(officeCell)) {
      office = officeByKey.get(officeKey(officeCell)) ?? null;
      if (!office) {
        results.push({
          row: rowNum,
          ok: false,
          message: `Unknown CENRO Office "${officeCell}". Valid offices: ${validList}.`,
        });
        continue;
      }
      lastOffice = office;
    } else {
      office = lastOffice;
      if (!office) {
        results.push({ row: rowNum, ok: false, message: "No CENRO Office given yet to carry down to this row." });
        continue;
      }
    }

    // ---- Year: same carry-down rule ----
    let yearNum: number | null = null;
    if (cellText(yearCell)) {
      yearNum = parseInt(String(yearCell), 10);
      if (!yearNum || yearNum < 2000 || yearNum > 2100) {
        results.push({ row: rowNum, ok: false, message: `Invalid Year "${yearCell}".` });
        continue;
      }
      lastYear = yearNum;
    } else {
      yearNum = lastYear;
      if (!yearNum) {
        results.push({ row: rowNum, ok: false, message: "No Year given yet to carry down to this row." });
        continue;
      }
    }

    // ---- Month: cell, then carried-down value, then parsed from the date text ----
    let monthNum: number | null = monthFromValue(monthCell);
    if (monthNum !== null) {
      lastMonth = monthNum;
    } else if (cellText(monthCell)) {
      // something was typed but it wasn't a recognizable month
      results.push({ row: rowNum, ok: false, message: `Month is invalid ("${monthCell}"). Enter 1\u201312 or a month name.` });
      continue;
    } else {
      monthNum = lastMonth ?? monthFromDateText(dateOfApprehension);
    }
    if (monthNum === null) {
      results.push({ row: rowNum, ok: false, message: "Month is missing and there is no prior month to carry down." });
      continue;
    }

    try {
      const hasItem = cellText(itemQty) || cellText(itemSpecies) || cellText(itemForms) || cellText(itemVolumeBdFt) || cellText(itemVolumeCuM) || cellText(itemValue);
      const hasConv = cellText(convType);
      const hasEquip = cellText(equipType);

      await prisma.apprehensionRecord.create({
        data: {
          cenroOfficeId: office.id,
          year: yearNum,
          month: monthNum,
          dateOfApprehension: cellText(dateOfApprehension),
          placeOfApprehension: cellText(placeOfApprehension),
          apprehendingAgency: cellText(apprehendingAgency),
          claimantRespondent: cellText(claimantRespondent),
          circumstances: cellText(circumstances),
          custodianLocation: cellText(custodianLocation),
          otherAgencies: cellText(otherAgencies),
          remarks: cellText(remarks),
          status: "UNKNOWN",
          items: hasItem
            ? {
                create: [{
                  quantity: cellText(itemQty),
                  species: cellText(itemSpecies),
                  forms: cellText(itemForms),
                  volumeBdFt: toNum(itemVolumeBdFt),
                  volumeCuM: toNum(itemVolumeCuM),
                  estimatedValue: toNum(itemValue),
                }],
              }
            : undefined,
          conveyances: hasConv
            ? { create: [{ type: String(convType).trim(), quantity: toQty(convQty), estimatedValue: toNum(convValue) }] }
            : undefined,
          equipment: hasEquip
            ? { create: [{ type: String(equipType).trim(), quantity: toQty(equipQty), estimatedValue: toNum(equipValue) }] }
            : undefined,
        },
      });
      imported += 1;
      results.push({ row: rowNum, ok: true, message: "Imported." });
    } catch (e) {
      results.push({ row: rowNum, ok: false, message: "Database error while saving this row." });
    }
  }

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { imported, errors: results.filter((r) => !r.ok) };
}
