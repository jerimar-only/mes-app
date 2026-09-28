// FILE: app/upload/actions.ts  (replace the whole file)

"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import * as XLSX from "xlsx";

// "CENRO APARRI" and "APARRI" both become "APARRI", so either spelling matches.
const officeKey = (name: unknown) =>
  String(name ?? "").trim().toUpperCase().replace(/^CENRO\s+/, "").replace(/\s+/g, " ");

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

type RowResult = { row: number; ok: boolean; message: string };

// Accepts 1-12, "9", "Sept", "September". Returns null if it can't tell.
function monthFromValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (/^\d{1,2}$/.test(s)) {
    const n = parseInt(s, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (s.length < 3) return null;
  const idx = MONTHS.findIndex((m) => m.startsWith(s.slice(0, 3)));
  return idx >= 0 ? idx + 1 : null;
}

// Fallback: find a month name anywhere in the date text, e.g. "September 21, 2026".
function monthFromDateText(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const m = String(v).toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
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

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i];
    if (!row || row.every((cell) => cell === null || cell === "")) continue;

    const [
      officeName, year, month, dateOfApprehension, placeOfApprehension,
      apprehendingAgency, claimantRespondent, circumstances, custodianLocation,
      otherAgencies, remarks,
      itemQty, itemSpecies, itemForms, itemVolumeBdFt, itemVolumeCuM, itemValue,
      convType, convQty,
      equipType, equipQty,
    ] = row;

    const office = officeByKey.get(officeKey(officeName));
    if (!office) {
      results.push({
        row: rowNum,
        ok: false,
        message: `Unknown CENRO Office "${officeName ?? ""}". Valid offices: ${validList}.`,
      });
      continue;
    }

    const yearNum = parseInt(String(year), 10);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      results.push({ row: rowNum, ok: false, message: `Invalid Year "${year}".` });
      continue;
    }

    // Month column first; if blank/invalid, try to read it from the date text.
    const monthNum = monthFromValue(month) ?? monthFromDateText(dateOfApprehension);
    if (monthNum === null) {
      results.push({
        row: rowNum,
        ok: false,
        message: `Month is missing or invalid ("${month ?? ""}"). Enter 1\u201312 or a month name.`,
      });
      continue;
    }

    try {
      const hasItem = itemQty || itemSpecies || itemForms || itemVolumeBdFt || itemVolumeCuM || itemValue;
      const hasConv = convType;
      const hasEquip = equipType;

      await prisma.apprehensionRecord.create({
        data: {
          cenroOfficeId: office.id,
          year: yearNum,
          month: monthNum,
          dateOfApprehension: dateOfApprehension ? String(dateOfApprehension) : null,
          placeOfApprehension: placeOfApprehension ? String(placeOfApprehension) : null,
          apprehendingAgency: apprehendingAgency ? String(apprehendingAgency) : null,
          claimantRespondent: claimantRespondent ? String(claimantRespondent) : null,
          circumstances: circumstances ? String(circumstances) : null,
          custodianLocation: custodianLocation ? String(custodianLocation) : null,
          otherAgencies: otherAgencies ? String(otherAgencies) : null,
          remarks: remarks ? String(remarks) : null,
          status: "UNKNOWN",
          items: hasItem
            ? {
                create: [{
                  quantity: itemQty ? String(itemQty) : null,
                  species: itemSpecies ? String(itemSpecies) : null,
                  forms: itemForms ? String(itemForms) : null,
                  volumeBdFt: itemVolumeBdFt ? parseFloat(String(itemVolumeBdFt)) : null,
                  volumeCuM: itemVolumeCuM ? parseFloat(String(itemVolumeCuM)) : null,
                  estimatedValue: itemValue ? parseFloat(String(itemValue)) : null,
                }],
              }
            : undefined,
          conveyances: hasConv
            ? { create: [{ type: String(convType), quantity: convQty ? parseInt(String(convQty), 10) : 1 }] }
            : undefined,
          equipment: hasEquip
            ? { create: [{ type: String(equipType), quantity: equipQty ? parseInt(String(equipQty), 10) : 1 }] }
            : undefined,
        },
      });
      imported += 1;
      results.push({ row: rowNum, ok: true, message: "Imported." });
    } catch (e) {
      results.push({ row: rowNum, ok: false, message: "Database error while saving this row." });
    }
  }

  return { imported, errors: results.filter((r) => !r.ok) };
}
